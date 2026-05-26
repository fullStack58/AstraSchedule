// tools/tests/test-enviar-solicitud-matricula.js
import { pool } from '../../scripts/db.js';
import { enviar_solicitud_matricula } from '../gestion/enviar_solicitud_matricula.js';

async function test() {
    try {
        console.log('📋 Probando enviar_solicitud_matricula...\n');

        // 1. Obtener datos de prueba: estudiante, periodo, materias
        console.log('--- Paso 1: Obtener datos de prueba ---');
        // Obtener un estudiante con paz y salvo (para que pueda matricular)
        const estudianteRes = await pool.query(`
            SELECT id, nombre, apellido, codigo_estudiantil, jornada_id, sede_id, paz_y_salvo
            FROM estudiantes
            WHERE paz_y_salvo = true
            LIMIT 1
        `);

        if (estudianteRes.rows.length === 0) {
            console.error('❌ No hay estudiantes con paz y salvo');
            return;
        }

        const estudiante = estudianteRes.rows[0];
        console.log(`   Estudiante ID: ${estudiante.id}`);
        console.log(`   Nombre: ${estudiante.nombre} ${estudiante.apellido}`);
        console.log(`   Código: ${estudiante.codigo_estudiantil}`);
        console.log(`   Jornada ID: ${estudiante.jornada_id}`);
        console.log(`   Sede ID: ${estudiante.sede_id}`);
        console.log(`   Paz y salvo: ${estudiante.paz_y_salvo}\n`);

        // Obtener periodo activo
        const periodoRes = await pool.query(`
            SELECT id, codigo FROM periodos_academicos WHERE activo = true LIMIT 1
        `);
        if (periodoRes.rows.length === 0) {
            console.error('❌ No hay periodo activo');
            return;
        }
        const periodo = periodoRes.rows[0];
        console.log(`   Periodo activo: ${periodo.codigo} (ID: ${periodo.id})\n`);

        // Obtener materias del semestre del estudiante (para matricular)
        const materiasRes = await pool.query(`
            SELECT id, codigo, nombre, semestre
            FROM materias m
            JOIN programas p ON p.id = m.programa_id
            WHERE p.codigo = 'IS'
              AND m.semestre = (
                  SELECT semestre_actual FROM estudiantes WHERE id = $1
              )
            LIMIT 3
        `, [estudiante.id]);

        if (materiasRes.rows.length === 0) {
            console.error('❌ No hay materias para matricular');
            return;
        }

        const materias = materiasRes.rows.map(m => m.id);
        console.log(`   Materias a matricular (${materias.length}):`);
        materiasRes.rows.forEach(m => {
            console.log(`      - ${m.codigo}: ${m.nombre} (Semestre ${m.semestre})`);
        });
        console.log('');

        // 2. Enviar solicitud de matrícula
        console.log('--- Paso 2: Enviar solicitud de matrícula ---');
        const resultado = await enviar_solicitud_matricula({
            estudiante_id: estudiante.id,
            periodo_id: periodo.id,
            materias: materias
        });

        const parsed = JSON.parse(resultado);
        console.log(`   Success: ${parsed.success}`);
        console.log(`   Mensaje: ${parsed.mensaje}`);
        if (parsed.detalles) {
            console.log(`   Exitosas: ${parsed.detalles.exitosas.length}`);
            parsed.detalles.exitosas.forEach(e => {
                console.log(`      ✅ ${e.materia_nombre} - Grupo ${e.grupo_asignado}`);
            });
            console.log(`   Fallidas: ${parsed.detalles.fallidas.length}`);
            parsed.detalles.fallidas.forEach(f => {
                console.log(`      ❌ ${f.materia_nombre}: ${f.razon}`);
            });
        }
        console.log('');

        // 3. Verificar inscripciones creadas en BD
        console.log('--- Paso 3: Verificar inscripciones en BD ---');
        const inscripcionesRes = await pool.query(`
            SELECT i.id, i.estado, m.codigo, m.nombre
            FROM inscripciones i
            JOIN grupos g ON g.id = i.grupo_id
            JOIN materias m ON m.id = g.materia_id
            WHERE i.estudiante_id = $1
              AND i.estado = 'activa'
              AND i.id IN (
                  SELECT MAX(i2.id) FROM inscripciones i2 
                  WHERE i2.estudiante_id = $1 
                  GROUP BY i2.grupo_id
              )
        `, [estudiante.id]);

        console.log(`   Inscripciones activas encontradas: ${inscripcionesRes.rows.length}`);
        inscripcionesRes.rows.forEach(i => {
            console.log(`      - ${i.codigo}: ${i.nombre} (estado: ${i.estado})`);
        });
        console.log('');

        // 4. Probar con parámetros inválidos
        console.log('--- Paso 4: Parámetros inválidos ---');
        // Sin estudiante_id
        const resultadoSinEstudiante = await enviar_solicitud_matricula({
            periodo_id: periodo.id,
            materias: materias
        });
        const parsedSinEstudiante = JSON.parse(resultadoSinEstudiante);
        console.log(`   Sin estudiante_id: Success=${parsedSinEstudiante.success}`);
        console.log(`   Error: ${parsedSinEstudiante.error}`);
        // Sin materias
        const resultadoSinMaterias = await enviar_solicitud_matricula({
            estudiante_id: estudiante.id,
            periodo_id: periodo.id,
            materias: []
        });
        const parsedSinMaterias = JSON.parse(resultadoSinMaterias);
        console.log(`   Sin materias: Success=${parsedSinMaterias.success}`);
        console.log(`   Error: ${parsedSinMaterias.error}\n`);

        // 5. Probar con estudiante sin paz y salvo (debe fallar por trigger)
        console.log('--- Paso 5: Estudiante SIN paz y salvo ---');
        const estudianteSinPaz = await pool.query(`
            SELECT id FROM estudiantes WHERE paz_y_salvo = false LIMIT 1
        `);
        if (estudianteSinPaz.rows.length > 0) {
            const resultadoSinPaz = await enviar_solicitud_matricula({
                estudiante_id: estudianteSinPaz.rows[0].id,
                periodo_id: periodo.id,
                materias: [materias[0]] // Solo una materia
            });
            const parsedSinPaz = JSON.parse(resultadoSinPaz);
            console.log(`   Success: ${parsedSinPaz.success}`);
            console.log(`   Mensaje: ${parsedSinPaz.mensaje}`);
            if (parsedSinPaz.detalles && parsedSinPaz.detalles.fallidas.length > 0) {
                console.log(`   Razón: ${parsedSinPaz.detalles.fallidas[0].razon}`);
            }
        }
        console.log('');

        // 6. LIMPIEZA: Eliminar inscripciones creadas en esta prueba
        console.log('--- Limpieza: Eliminar inscripciones de prueba ---');
        for (const exito of parsed.detalles?.exitosas || []) {
            await pool.query(`
                DELETE FROM inscripciones 
                WHERE estudiante_id = $1 
                  AND id IN (
                      SELECT id FROM inscripciones 
                      WHERE estudiante_id = $1 
                      ORDER BY id DESC LIMIT ${parsed.detalles.exitosas.length}
                  )
            `, [estudiante.id]);
        }
        console.log(`   ✅ Inscripciones de prueba eliminadas`);

        console.log('\n✅ Prueba completada!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

test();