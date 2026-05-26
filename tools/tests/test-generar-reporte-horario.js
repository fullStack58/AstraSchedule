// tools/tests/test-generar-reporte-horario.js

import { pool } from '../../scripts/db.js';

import { generar_reporte_horario } from '../reportes/generar_reporte_horario.js';

import { asignar_clase } from '../generacion/asignar_clase.js';

async function test() {

    try {

        console.log('📋 Probando generar_reporte_horario...\n');

        // 1. Limpiar y crear datos de prueba

        console.log('--- Paso 1: Preparar datos de prueba ---');

        await pool.query(`DELETE FROM horario_asignado`);

        await pool.query(`DELETE FROM conflictos_detectados`);

        // Crear algunas asignaciones en diferentes estados

        console.log('   Creando asignaciones de prueba...');

        // Buscar datos para crear asignaciones

        const datos = await pool.query(`

            SELECT 

                g.id AS grupo_id,

                d.id AS docente_id,

                s.id AS salon_id,

                f.id AS franja_id,

                m.codigo AS materia_codigo,

                g.numero AS grupo_numero,

                d.nombre AS docente_nombre,

                d.disponibilidad AS docente_disp,

                b.jornada_id AS franja_jornada,

                g.jornada_id AS grupo_jornada

            FROM grupos g

            JOIN materias m ON m.id = g.materia_id

            JOIN docentes d ON d.activo = true

            JOIN salones s ON s.disponible = true

            JOIN franjas_horarias f ON f.periodo_id = (SELECT id FROM periodos_academicos WHERE activo = true)

            JOIN bloques_horarios b ON b.id = f.bloque_id

            WHERE m.codigo = 'IS-101'

              AND g.jornada_id = b.jornada_id

              AND NOT EXISTS (SELECT 1 FROM horario_asignado ha WHERE ha.docente_id = d.id AND ha.franja_id = f.id)

              AND (

                  d.disponibilidad = 'Ambas' 

                  OR (d.disponibilidad = 'Diurna' AND b.jornada_id = 1)

                  OR (d.disponibilidad = 'Nocturna' AND b.jornada_id = 2)

              )

            LIMIT 3

        `);

        if (datos.rows.length < 3) {

            console.error('❌ No hay suficientes datos para crear asignaciones');

            return;

        }

        // Asignación 1: estado 'propuesto'

        const asig1 = await asignar_clase({

            grupo_id: datos.rows[0].grupo_id,

            docente_id: datos.rows[0].docente_id,

            aula_id: datos.rows[0].salon_id,

            franja_id: datos.rows[0].franja_id,

            es_definitiva: false

        });

        console.log(`   ✅ Asignación 1: ID ${asig1.id} (propuesto)`);

        // Asignación 2: estado 'confirmado'

        const asig2 = await asignar_clase({

            grupo_id: datos.rows[1].grupo_id,

            docente_id: datos.rows[1].docente_id,

            aula_id: datos.rows[1].salon_id,

            franja_id: datos.rows[1].franja_id,

            es_definitiva: true

        });

        console.log(`   ✅ Asignación 2: ID ${asig2.id} (confirmado)`);

        // Asignación 3: estado 'propuesto' luego cancelado

        const asig3 = await asignar_clase({

            grupo_id: datos.rows[2].grupo_id,

            docente_id: datos.rows[2].docente_id,

            aula_id: datos.rows[2].salon_id,

            franja_id: datos.rows[2].franja_id,

            es_definitiva: false

        });

        await pool.query(`UPDATE horario_asignado SET estado = 'cancelado' WHERE id = $1`, [asig3.id]);

        console.log(`   ✅ Asignación 3: ID ${asig3.id} (cancelado)\n`);

        // 2. Generar reporte SIN filtros

        console.log('--- Paso 2: Generar reporte SIN filtros ---');

        const resultado1 = await generar_reporte_horario({});

        const parsed1 = JSON.parse(resultado1);

        console.log(`   Success: ${parsed1.success}`);

        console.log(`   Mensaje: ${parsed1.mensaje}`);

        console.log(`   Filtros: periodo=${parsed1.filtros_aplicados.periodo_id}, programa=${parsed1.filtros_aplicados.programa_id}`);

        console.log(`   Total asignaciones: ${parsed1.estadisticas.total_asignaciones_registradas}`);

        console.log(`   Desglose por estado:`, parsed1.estadisticas.desglose_por_estado);

        console.log(`   Docentes con mayor carga:`);

        parsed1.estadisticas.docentes_con_mayor_carga.forEach((d, i) => {

            console.log(`      ${i + 1}. ${d.nombre}: ${d.horas_asignadas}h`);

        });

        console.log('');

        // 3. Generar reporte CON filtro de programa

        console.log('--- Paso 3: Generar reporte con filtro programa IS ---');

        const resultado2 = await generar_reporte_horario({

            programa_id: 'IS'

        });

        const parsed2 = JSON.parse(resultado2);

        console.log(`   Success: ${parsed2.success}`);

        console.log(`   Total asignaciones IS: ${parsed2.estadisticas.total_asignaciones_registradas}`);

        console.log(`   Desglose:`, parsed2.estadisticas.desglose_por_estado);

        console.log('');

        // 4. Generar reporte CON filtro de periodo

        console.log('--- Paso 4: Generar reporte con filtro periodo activo ---');

        const periodoRes = await pool.query(`SELECT id FROM periodos_academicos WHERE activo = true LIMIT 1`);

        const periodoActivo = periodoRes.rows[0]?.id;

        const resultado3 = await generar_reporte_horario({

            periodo_id: periodoActivo

        });

        const parsed3 = JSON.parse(resultado3);

        console.log(`   Success: ${parsed3.success}`);

        console.log(`   Total asignaciones periodo activo: ${parsed3.estadisticas.total_asignaciones_registradas}`);

        console.log('');

        // 5. Generar reporte CON ambos filtros

        console.log('--- Paso 5: Generar reporte con filtros programa IS y periodo activo ---');

        const resultado4 = await generar_reporte_horario({

            programa_id: 'IS',

            periodo_id: periodoActivo

        });

        const parsed4 = JSON.parse(resultado4);

        console.log(`   Success: ${parsed4.success}`);

        console.log(`   Total: ${parsed4.estadisticas.total_asignaciones_registradas}`);

        console.log(`   Filtros aplicados: programa=${parsed4.filtros_aplicados.programa_id}, periodo=${parsed4.filtros_aplicados.periodo_id}`);

        console.log('');

        // 6. Generar reporte con programa inexistente (debe devolver 0)

        console.log('--- Paso 6: Reporte con programa inexistente ---');

        const resultado5 = await generar_reporte_horario({

            programa_id: 'XX'

        });

        const parsed5 = JSON.parse(resultado5);

        console.log(`   Success: ${parsed5.success}`);

        console.log(`   Total asignaciones: ${parsed5.estadisticas.total_asignaciones_registradas} (debe ser 0)`);

        console.log('');

        // 7. Limpiar

        console.log('--- Limpieza: Eliminar asignaciones de prueba ---');

        await pool.query(`DELETE FROM conflictos_detectados`);

        await pool.query(`DELETE FROM horario_asignado`);

        console.log(`   ✅ Asignaciones eliminadas`);

        console.log('\n✅ Prueba completada!');

    } catch (error) {

        console.error('❌ Error:', error.message);

    } finally {

        await pool.end();

    }

}

test();
