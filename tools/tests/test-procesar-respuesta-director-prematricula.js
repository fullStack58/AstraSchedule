// tools/tests/test-procesar-respuesta-director-prematricula.js
import { pool } from '../../scripts/db.js';
import { procesar_respuesta_director_prematricula } from '../gestion/procesar_respuesta_director_prematricula.js';

async function test() {
    try {
        console.log('📋 Probando procesar_respuesta_director_prematricula...\n');

        // 1. Primero, obtener un estudiante real de la BD
        console.log('--- Paso 1: Obtener estudiante de prueba ---');
        const estudianteRes = await pool.query(`
            SELECT id, nombre, apellido, codigo_estudiantil
            FROM estudiantes
            LIMIT 1
        `);

        if (estudianteRes.rows.length === 0) {
            console.error('❌ No hay estudiantes en la BD');
            return;
        }

        const estudiante = estudianteRes.rows[0];
        console.log(`   Estudiante ID: ${estudiante.id}`);
        console.log(`   Nombre: ${estudiante.nombre} ${estudiante.apellido}`);
        console.log(`   Código: ${estudiante.codigo_estudiantil}\n`);

        // 2. Probar respuesta APROBADO
        console.log('--- Paso 2: Respuesta del director: APROBADO ---');
        const resultado1 = await procesar_respuesta_director_prematricula({
            solicitud_id: estudiante.id,
            respuesta: 'Aprobado',
            observaciones_director: 'El estudiante cumple con todos los requisitos académicos',
            ajustes_horario: null
        });

        const parsed1 = JSON.parse(resultado1);
        console.log(`   Success: ${parsed1.success}`);
        console.log(`   Mensaje: ${parsed1.mensaje}`);
        console.log(`   Decisión: ${parsed1.detalles.decision}`);
        console.log(`   Requiere cambios: ${parsed1.detalles.requiere_cambios}`);
        console.log(`   Observaciones: ${parsed1.detalles.observaciones}`);
        console.log(`   Ajustes: ${parsed1.detalles.ajustes_sugeridos || 'Ninguno'}\n`);

        // 3. Probar respuesta RECHAZADO
        console.log('--- Paso 3: Respuesta del director: RECHAZADO ---');
        const resultado2 = await procesar_respuesta_director_prematricula({
            solicitud_id: estudiante.id,
            respuesta: 'Rechazado',
            observaciones_director: 'El estudiante no tiene paz y salvo',
            ajustes_horario: null
        });

        const parsed2 = JSON.parse(resultado2);
        console.log(`   Success: ${parsed2.success}`);
        console.log(`   Mensaje: ${parsed2.mensaje}`);
        console.log(`   Decisión: ${parsed2.detalles.decision}`);
        console.log(`   Requiere cambios: ${parsed2.detalles.requiere_cambios}\n`);

        // 4. Probar respuesta CON AJUSTES
        console.log('--- Paso 4: Respuesta del director: CON AJUSTES ---');
        const resultado3 = await procesar_respuesta_director_prematricula({
            solicitud_id: estudiante.id,
            respuesta: 'Con ajustes',
            observaciones_director: 'Aprobar materias de primer semestre solamente',
            ajustes_horario: 'Solo materias IS-101, IS-102, IS-103'
        });

        const parsed3 = JSON.parse(resultado3);
        console.log(`   Success: ${parsed3.success}`);
        console.log(`   Decisión: ${parsed3.detalles.decision}`);
        console.log(`   Requiere cambios: ${parsed3.detalles.requiere_cambios}`);
        console.log(`   Ajustes sugeridos: ${parsed3.detalles.ajustes_sugeridos}\n`);

        // 5. Probar respuesta PENDIENTE
        console.log('--- Paso 5: Respuesta del director: PENDIENTE ---');
        const resultado4 = await procesar_respuesta_director_prematricula({
            solicitud_id: estudiante.id,
            respuesta: 'Pendiente',
            observaciones_director: 'Esperando documentos adicionales',
            ajustes_horario: null
        });

        const parsed4 = JSON.parse(resultado4);
        console.log(`   Success: ${parsed4.success}`);
        console.log(`   Decisión: ${parsed4.detalles.decision}`);
        console.log(`   Requiere cambios: ${parsed4.detalles.requiere_cambios}\n`);

        // 6. Probar con parámetros inválidos (sin solicitud_id)
        console.log('--- Paso 6: Parámetros inválidos (sin solicitud_id) ---');
        const resultadoInvalido1 = await procesar_respuesta_director_prematricula({
            respuesta: 'Aprobado'
        });
        const parsedInvalido1 = JSON.parse(resultadoInvalido1);
        console.log(`   Success: ${parsedInvalido1.success}`);
        console.log(`   Error: ${parsedInvalido1.error}\n`);

        // 7. Probar con parámetros inválidos (sin respuesta)
        console.log('--- Paso 7: Parámetros inválidos (sin respuesta) ---');
        const resultadoInvalido2 = await procesar_respuesta_director_prematricula({
            solicitud_id: estudiante.id
        });
        const parsedInvalido2 = JSON.parse(resultadoInvalido2);
        console.log(`   Success: ${parsedInvalido2.success}`);
        console.log(`   Error: ${parsedInvalido2.error}\n`);

        // 8. Probar con estudiante inexistente (la tool no valida existencia en BD)
        console.log('--- Paso 8: Estudiante inexistente (IGUAL funciona, es solo procesamiento lógico) ---');
        const resultadoInexistente = await procesar_respuesta_director_prematricula({
            solicitud_id: 99999,
            respuesta: 'Aprobado',
            observaciones_director: 'Estudiante inexistente pero la tool procesa igual',
            ajustes_horario: null
        });
        const parsedInexistente = JSON.parse(resultadoInexistente);
        console.log(`   Success: ${parsedInexistente.success}`);
        console.log(`   Decisión: ${parsedInexistente.detalles.decision}`);
        console.log(`   (La tool NO valida existencia en BD, solo procesa la respuesta lógicamente)\n`);

        console.log('✅ Prueba completada!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

test();