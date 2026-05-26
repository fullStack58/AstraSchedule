// tools/tests/test-procesar-contrapropuesta-docente.js

import { pool } from '../../scripts/db.js';

import { procesar_contrapropuesta_docente } from '../gestion/procesar_contrapropuesta_docente.js';

import { asignar_clase } from '../generacion/asignar_clase.js';

async function test() {

    try {

        console.log('📋 Probando procesar_contrapropuesta_docente...\n');

        // 1. Crear una asignación inicial en estado 'propuesto'

        console.log('--- Paso 1: Crear asignación inicial ---');

        const datos = await pool.query(`

            SELECT 

                g.id AS grupo_id,

                d.id AS docente_id,

                s.id AS salon_id,

                f.id AS franja_id,

                f.dia,

                b.codigo AS bloque,

                m.codigo AS materia_codigo,

                g.numero AS grupo_numero,

                d.nombre AS docente_nombre

            FROM grupos g

            JOIN materias m ON m.id = g.materia_id

            JOIN docentes d ON d.activo = true

            JOIN salones s ON s.disponible = true

            JOIN franjas_horarias f ON f.periodo_id = (SELECT id FROM periodos_academicos WHERE activo = true)

            JOIN bloques_horarios b ON b.id = f.bloque_id

            WHERE m.codigo = 'IS-101'

              AND g.jornada_id = b.jornada_id

              AND d.disponibilidad IN ('Ambas', 'Nocturna')

              AND NOT EXISTS (SELECT 1 FROM horario_asignado ha WHERE ha.docente_id = d.id AND ha.franja_id = f.id)

            LIMIT 1

        `);

        if (datos.rows.length === 0) {

            console.error('❌ No hay datos para crear asignación');

            return;

        }

        const asignacion = await asignar_clase({

            grupo_id: datos.rows[0].grupo_id,

            docente_id: datos.rows[0].docente_id,

            aula_id: datos.rows[0].salon_id,

            franja_id: datos.rows[0].franja_id,

            es_definitiva: false

        });

        console.log(`   ✅ Asignación creada: ID ${asignacion.id}`);

        console.log(`      Materia: ${datos.rows[0].materia_codigo} - Grupo ${datos.rows[0].grupo_numero}`);

        console.log(`      Docente: ${datos.rows[0].docente_nombre}`);

        console.log(`      Horario: ${datos.rows[0].dia} - ${datos.rows[0].bloque}`);

        console.log(`      Estado: ${asignacion.estado}\n`);

        // 2. Obtener una franja alternativa válida para la contrapropuesta

        console.log('--- Paso 2: Buscar franja alternativa ---');

        const franjaAlternativa = await pool.query(`

            SELECT f.id, f.dia, b.codigo AS bloque, b.hora_inicio, b.hora_fin

            FROM franjas_horarias f

            JOIN bloques_horarios b ON b.id = f.bloque_id

            JOIN periodos_academicos p ON p.id = f.periodo_id

            WHERE p.activo = true

              AND f.id != $1

              AND NOT EXISTS (

                  SELECT 1 FROM horario_asignado ha

                  WHERE ha.franja_id = f.id 

                    AND ha.docente_id = $2

                    AND ha.estado != 'cancelado'

              )

            LIMIT 1

        `, [datos.rows[0].franja_id, datos.rows[0].docente_id]);

        if (franjaAlternativa.rows.length === 0) {

            console.error('❌ No hay franja alternativa disponible');

            // Limpiar

            await pool.query(`DELETE FROM horario_asignado WHERE id = $1`, [asignacion.id]);

            return;

        }

        console.log(`   ✅ Franja alternativa encontrada: ID ${franjaAlternativa.rows[0].id}`);

        console.log(`      ${franjaAlternativa.rows[0].dia} - ${franjaAlternativa.rows[0].bloque} (${franjaAlternativa.rows[0].hora_inicio} a ${franjaAlternativa.rows[0].hora_fin})\n`);

        // 3. Procesar contrapropuesta del docente (CASO VÁLIDO)

        console.log('--- Paso 3: Procesar contrapropuesta válida ---');

        const resultado = await procesar_contrapropuesta_docente({

            asignacion_id: asignacion.id,

            nueva_franja_sugerida: franjaAlternativa.rows[0].id,

            salon_alternativo: null,

            motivo: 'Docente solicita cambio por disponibilidad'

        });

        const parsed = JSON.parse(resultado);

        console.log(`   Success: ${parsed.success}`);

        console.log(`   Mensaje: ${parsed.mensaje}`);

        if (parsed.nueva_asignacion) {

            console.log(`   Nueva franja ID: ${parsed.nueva_asignacion.franja_id}`);

        }

        console.log('');

        // 4. Verificar que la asignación se actualizó

        console.log('--- Paso 4: Verificar actualización en BD ---');

        const verificar = await pool.query(`

            SELECT ha.franja_id, ha.estado, f.dia, b.codigo AS bloque

            FROM horario_asignado ha

            JOIN franjas_horarias f ON f.id = ha.franja_id

            JOIN bloques_horarios b ON b.id = f.bloque_id

            WHERE ha.id = $1

        `, [asignacion.id]);

        console.log(`   Nueva franja ID: ${verificar.rows[0].franja_id}`);

        console.log(`   Nuevo horario: ${verificar.rows[0].dia} - ${verificar.rows[0].bloque}`);

        console.log(`   Estado: ${verificar.rows[0].estado} (debe ser 'propuesto')\n`);

        // 5. Probar contrapropuesta INVALIDA (misma franja o conflicto)

        console.log('--- Paso 5: Probar contrapropuesta inválida (misma franja) ---');

        const resultadoInvalido = await procesar_contrapropuesta_docente({

            asignacion_id: asignacion.id,

            nueva_franja_sugerida: verificar.rows[0].franja_id,

            salon_alternativo: null,

            motivo: 'Intentando misma franja'

        });

        const parsedInvalido = JSON.parse(resultadoInvalido);

        console.log(`   Success: ${parsedInvalido.success}`);

        console.log(`   Error: ${parsedInvalido.error}\n`);

        // 6. Probar con asignación inexistente

        console.log('--- Paso 6: Asignación inexistente ---');

        const resultadoInexistente = await procesar_contrapropuesta_docente({

            asignacion_id: 99999,

            nueva_franja_sugerida: franjaAlternativa.rows[0].id,

            salon_alternativo: null,

            motivo: 'Test'

        });

        const parsedInexistente = JSON.parse(resultadoInexistente);

        console.log(`   Success: ${parsedInexistente.success}`);

        console.log(`   Error: ${parsedInexistente.error}\n`);

        // 7. Probar con parámetros inválidos

        console.log('--- Paso 7: Parámetros inválidos ---');

        const resultadoSinParams = await procesar_contrapropuesta_docente({});

        const parsedSinParams = JSON.parse(resultadoSinParams);

        console.log(`   Success: ${parsedSinParams.success}`);

        console.log(`   Error: ${parsedSinParams.error}\n`);

        // 8. Limpiar

        console.log('--- Limpieza: Eliminar asignación ---');

        await pool.query(`DELETE FROM conflictos_detectados WHERE horario_id = $1`, [asignacion.id]);

        await pool.query(`DELETE FROM horario_asignado WHERE id = $1`, [asignacion.id]);

        console.log(`   ✅ Asignación ID ${asignacion.id} eliminada`);

        console.log('\n✅ Prueba completada!');

    } catch (error) {

        console.error('❌ Error:', error.message);

    } finally {

        await pool.end();

    }

}

test();
