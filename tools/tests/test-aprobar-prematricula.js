// tools/tests/test-aprobar-prematricula.js
import { pool } from '../../scripts/db.js';
import { aprobar_prematricula } from '../gestion/aprobar_prematricula.js';

async function test() {
    try {
        console.log('📋 Probando aprobar_prematricula...\n');

        // 1. Primero, necesitamos un estudiante con inscripciones activas
        console.log('--- Paso 1: Verificar datos existentes ---');
        // Buscar un estudiante con inscripciones activas
        const estudianteRes = await pool.query(`
            SELECT DISTINCT i.estudiante_id, e.nombre, e.apellido, e.codigo_estudiantil
            FROM inscripciones i
            JOIN estudiantes e ON e.id = i.estudiante_id
            WHERE i.estado = 'activa'
            LIMIT 1
        `);

        if (estudianteRes.rows.length === 0) {
            console.error('❌ No hay estudiantes con inscripciones activas');
            console.log('   Ejecuta npm run seed:horarios primero');
            return;
        }

        const estudiante = estudianteRes.rows[0];
        console.log(`   Estudiante: ${estudiante.nombre} ${estudiante.apellido} (ID: ${estudiante.estudiante_id})`);
        console.log(`   Código: ${estudiante.codigo_estudiantil}\n`);

        // 2. Obtener las materias en las que está inscrito (activas)
        console.log('--- Paso 2: Obtener materias activas del estudiante ---');
        const materiasRes = await pool.query(`
            SELECT 
                g.materia_id,
                m.codigo AS materia_codigo,
                m.nombre AS materia_nombre,
                i.id AS inscripcion_id,
                i.estado AS estado_actual
            FROM inscripciones i
            JOIN grupos g ON g.id = i.grupo_id
            JOIN materias m ON m.id = g.materia_id
            WHERE i.estudiante_id = $1 AND i.estado = 'activa'
        `, [estudiante.estudiante_id]);

        if (materiasRes.rows.length === 0) {
            console.error('❌ El estudiante no tiene materias activas');
            return;
        }

        console.log(`   Materias activas encontradas: ${materiasRes.rows.length}`);
        materiasRes.rows.forEach(m => {
            console.log(`      - ${m.materia_codigo}: ${m.materia_nombre} (estado: ${m.estado_actual})`);
        });
        console.log('');

        // 3. Probar aprobar_prematricula (aprobar TODAS las materias activas)
        console.log('--- Paso 3: Aprobar todas las materias activas ---');
        const materiasIds = materiasRes.rows.map(m => m.materia_id);
        const director_id = 1; // Director simulado
        const resultado = await aprobar_prematricula({
            solicitud_id: estudiante.estudiante_id,
            director_id: director_id,
            materias_aprobadas: materiasIds
        });

        const parsedResult = JSON.parse(resultado);
        console.log(`   Success: ${parsedResult.success}`);
        console.log(`   Mensaje: ${parsedResult.mensaje}`);
        console.log(`   Materias aprobadas: ${parsedResult.materias_aprobadas_count}`);
        if (parsedResult.detalles) {
            console.log(`   Detalles:`);
            parsedResult.detalles.forEach(d => {
                console.log(`      - Inscripción ID ${d.inscripcion_id}: materia ${d.materia_id} → ${d.estado}`);
            });
        }
        console.log('');

        // 4. Verificar que el estado cambió en la BD
        console.log('--- Paso 4: Verificar estado en BD ---');
        const verificarRes = await pool.query(`
            SELECT i.id, i.estado, m.codigo
            FROM inscripciones i
            JOIN grupos g ON g.id = i.grupo_id
            JOIN materias m ON m.id = g.materia_id
            WHERE i.estudiante_id = $1 AND i.estado = 'aprobada'
        `, [estudiante.estudiante_id]);
        console.log(`   Materias con estado 'aprobada': ${verificarRes.rows.length}`);
        verificarRes.rows.forEach(i => {
            console.log(`      - ${i.codigo}: ${i.estado}`);
        });
        console.log('');

        // 5. Probar con materias inválidas (que no existen)
        console.log('--- Paso 5: Probar con materias inválidas (debe fallar) ---');
        const resultadoInvalido = await aprobar_prematricula({
            solicitud_id: estudiante.estudiante_id,
            director_id: director_id,
            materias_aprobadas: [99999, 88888] // IDs inexistentes
        });
        const parsedInvalido = JSON.parse(resultadoInvalido);
        console.log(`   Success: ${parsedInvalido.success}`);
        console.log(`   Error: ${parsedInvalido.error || 'Ninguno'}`);
        console.log('');

        // 6. Probar con parámetros inválidos
        console.log('--- Paso 6: Probar con parámetros inválidos ---');
        const resultadoSinParams = await aprobar_prematricula({});
        const parsedSinParams = JSON.parse(resultadoSinParams);
        console.log(`   Success: ${parsedSinParams.success}`);
        console.log(`   Error: ${parsedSinParams.error}`);
        console.log('');

        // 7. LIMPIEZA: Revertir los cambios (volver a estado 'activa')
        console.log('--- Limpieza: Revertir cambios ---');
        for (const m of materiasRes.rows) {
            await pool.query(`
                UPDATE inscripciones 
                SET estado = 'activa' 
                WHERE id = $1
            `, [m.inscripcion_id]);
        }
        console.log(`   ✅ ${materiasRes.rows.length} inscripciones restauradas a estado 'activa'`);

        console.log('\n✅ Prueba completada!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.query('ROLLBACK');
    } finally {
        await pool.end();
    }
}

test();