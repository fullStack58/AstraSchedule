// tools/tests/test-bloquear-horario-definitivo.js
import { pool } from '../../scripts/db.js';
import { bloquear_horario_definitivo } from '../gestion/bloquear_horario_definitivo.js';
import { asignar_clase } from '../generacion/asignar_clase.js';

async function test() {
    try {
        console.log('📋 Probando bloquear_horario_definitivo...\n');

        // 1. Crear una asignación inicial en estado 'propuesto'
        console.log('--- Paso 1: Crear asignación en estado propuesto ---');
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
            es_definitiva: false  // estado 'propuesto'
        });

        console.log(`   ✅ Asignación creada: ID ${asignacion.id}`);
        console.log(`      Materia: ${datos.rows[0].materia_codigo} - Grupo ${datos.rows[0].grupo_numero}`);
        console.log(`      Docente: ${datos.rows[0].docente_nombre} (${datos.rows[0].docente_disp})`);
        console.log(`      Horario: ${datos.rows[0].dia} - ${datos.rows[0].bloque}`);
        console.log(`      Estado actual: ${asignacion.estado}\n`);

        // 2. Bloquear horario como definitivo (CASO VÁLIDO)
        console.log('--- Paso 2: Bloquear horario como definitivo (Director) ---');
        const resultado = await bloquear_horario_definitivo({
            asignacion_id_aceptada: asignacion.id,
            confirmado_por: 'Director de programa'
        });

        const parsed = JSON.parse(resultado);
        console.log(`   Success: ${parsed.success}`);
        console.log(`   Mensaje: ${parsed.mensaje}`);
        if (parsed.detalles) {
            console.log(`   ID: ${parsed.detalles.id}`);
            console.log(`   Nuevo estado: ${parsed.detalles.estado}`);
        }
        console.log('');

        // 3. Verificar estado en BD (debe ser 'confirmado')
        console.log('--- Paso 3: Verificar estado en BD ---');
        const verificar = await pool.query(`
            SELECT id, estado, actualizado_en 
            FROM horario_asignado 
            WHERE id = $1
        `, [asignacion.id]);
        console.log(`   Estado actual: ${verificar.rows[0].estado} (debe ser 'confirmado')`);
        console.log(`   Actualizado: ${verificar.rows[0].actualizado_en}\n`);

        // 4. Intentar bloquear nuevamente (debe fallar o no cambiar)
        console.log('--- Paso 4: Intentar bloquear nuevamente ---');
        const resultado2 = await bloquear_horario_definitivo({
            asignacion_id_aceptada: asignacion.id,
            confirmado_por: 'Docente'
        });
        const parsed2 = JSON.parse(resultado2);
        console.log(`   Success: ${parsed2.success}`);
        console.log(`   Mensaje: ${parsed2.mensaje}`);
        console.log(`   (El estado ya es 'confirmado', la actualización es redundante pero no causa error)\n`);

        // 5. Probar con asignación inexistente
        console.log('--- Paso 5: Asignación inexistente ---');
        const resultadoInexistente = await bloquear_horario_definitivo({
            asignacion_id_aceptada: 99999,
            confirmado_por: 'Director'
        });
        const parsedInexistente = JSON.parse(resultadoInexistente);
        console.log(`   Success: ${parsedInexistente.success}`);
        console.log(`   Error: ${parsedInexistente.error}\n`);

        // 6. Probar con parámetros inválidos
        console.log('--- Paso 6: Parámetros inválidos ---');
        // Sin confirmado_por
        const resultadoSinConfirmado = await bloquear_horario_definitivo({
            asignacion_id_aceptada: asignacion.id
        });
        const parsedSinConfirmado = JSON.parse(resultadoSinConfirmado);
        console.log(`   Sin confirmado_por: Success=${parsedSinConfirmado.success}, Error=${parsedSinConfirmado.error}`);
        // Sin asignacion_id
        const resultadoSinId = await bloquear_horario_definitivo({
            confirmado_por: 'Director'
        });
        const parsedSinId = JSON.parse(resultadoSinId);
        console.log(`   Sin asignacion_id: Success=${parsedSinId.success}, Error=${parsedSinId.error}\n`);

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