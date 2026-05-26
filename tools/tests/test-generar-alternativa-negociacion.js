// tools/tests/test-generar-alternativa-negociacion.js
import { pool } from '../../scripts/db.js';
import { generar_alternativa_negociacion } from '../gestion/generar_alternativa_negociacion.js';
import { asignar_clase } from '../generacion/asignar_clase.js';

async function test() {
    try {
        console.log('📋 Probando generar_alternativa_negociacion...\n');

        // 1. Crear una asignación inicial CON FILTROS CORRECTOS
        console.log('--- Paso 1: Crear asignación inicial ---');
        const datos = await pool.query(`
            SELECT 
                g.id AS grupo_id,
                d.id AS docente_id,
                s.id AS salon_id,
                f.id AS franja_id,
                f.dia,
                b.codigo AS bloque,
                b.jornada_id AS franja_jornada,
                m.codigo AS materia_codigo,
                g.numero AS grupo_numero,
                d.nombre AS docente_nombre,
                d.disponibilidad AS docente_disp
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
        console.log(`      Docente: ${datos.rows[0].docente_nombre} (${datos.rows[0].docente_disp})`);
        console.log(`      Horario actual: ${datos.rows[0].dia} - ${datos.rows[0].bloque}`);
        console.log(`      Estado: ${asignacion.estado}\n`);

        // 2. Verificar disponibilidad del docente
        console.log('--- Paso 2: Verificar disponibilidad del docente ---');
        const disponibilidadRes = await pool.query(`
            SELECT COUNT(*) as total
            FROM disponibilidad_docente dd
            WHERE dd.docente_id = $1
        `, [datos.rows[0].docente_id]);
        console.log(`   Docente ID ${datos.rows[0].docente_id} tiene ${disponibilidadRes.rows[0].total} franjas registradas en disponibilidad_docente\n`);

        // 3. Generar alternativas sin criterios
        console.log('--- Paso 3: Generar alternativas sin criterios ---');
        const resultado1 = await generar_alternativa_negociacion({
            asignacion_id_rechazada: asignacion.id
        });
        const parsed1 = JSON.parse(resultado1);
        console.log(`   Success: ${parsed1.success}`);
        console.log(`   Mensaje: ${parsed1.mensaje}`);
        if (parsed1.alternativas && parsed1.alternativas.length > 0) {
            console.log(`   Alternativas encontradas: ${parsed1.alternativas.length}`);
            parsed1.alternativas.forEach((alt, i) => {
                console.log(`      ${i + 1}. Franja ${alt.franja_id}: ${alt.dia} - ${alt.jornada} (${alt.hora_inicio} a ${alt.hora_fin})`);
            });
        } else if (parsed1.success) {
            console.log(`   ℹ️ No se encontraron alternativas disponibles`);
        }
        console.log('');

        // 4. Generar alternativas con criterios
        console.log('--- Paso 4: Generar alternativas con criterios ---');
        const resultado2 = await generar_alternativa_negociacion({
            asignacion_id_rechazada: asignacion.id,
            criterios_prioridad: 'Misma jornada'
        });
        const parsed2 = JSON.parse(resultado2);
        console.log(`   Success: ${parsed2.success}`);
        console.log(`   Mensaje: ${parsed2.mensaje}`);
        console.log(`   Criterios aplicados: ${parsed2.criterios_aplicados}`);
        console.log(`   Alternativas: ${parsed2.alternativas?.length || 0}\n`);

        // 5. Probar con asignación inexistente
        console.log('--- Paso 5: Asignación inexistente ---');
        const resultadoInexistente = await generar_alternativa_negociacion({
            asignacion_id_rechazada: 99999
        });
        const parsedInexistente = JSON.parse(resultadoInexistente);
        console.log(`   Success: ${parsedInexistente.success}`);
        console.log(`   Error: ${parsedInexistente.error}\n`);

        // 6. Probar sin parámetros
        console.log('--- Paso 6: Sin parámetros ---');
        const resultadoSinParams = await generar_alternativa_negociacion({});
        const parsedSinParams = JSON.parse(resultadoSinParams);
        console.log(`   Success: ${parsedSinParams.success}`);
        console.log(`   Error: ${parsedSinParams.error}\n`);

        // 7. Limpiar
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