// test-enviar-formato.js
import { pool } from '../../scripts/db.js';
import { enviar_formato_prematricula } from '../gestion/enviar_formato_prematricula.js';

async function testEnviarFormato() {
    try {
        // === Caso 1: Parámetros incompletos (falta materias_solicitadas) ===
        console.log('\n--- Test 1: Parámetros incompletos ---');
        const result1 = await enviar_formato_prematricula({
            estudiante_id: 1,
            estudiante_nombre: 'Esteban Cárdenas',
            programa_id: 'IS',
            semestre_actual: 5
            // falta materias_solicitadas
        });
        console.log('Respuesta:', result1);
        const json1 = JSON.parse(result1);
        console.assert(json1.success === false, '✅ Error esperado por parámetros incompletos');

        // === Caso 2: materias_solicitadas no es un array ===
        console.log('\n--- Test 2: materias_solicitadas no es array ---');
        const result2 = await enviar_formato_prematricula({
            estudiante_id: 1,
            estudiante_nombre: 'Esteban Cárdenas',
            programa_id: 'IS',
            semestre_actual: 5,
            materias_solicitadas: 'texto'
        });
        console.log('Respuesta:', result2);
        const json2 = JSON.parse(result2);
        console.assert(json2.success === false && json2.error.includes('Parámetros incompletos'), '✅ Error esperado');

        // === Caso 3: materias_solicitadas vacío ===
        console.log('\n--- Test 3: materias_solicitadas vacío ---');
        const result3 = await enviar_formato_prematricula({
            estudiante_id: 1,
            estudiante_nombre: 'Esteban Cárdenas',
            programa_id: 'IS',
            semestre_actual: 5,
            materias_solicitadas: []
        });
        console.log('Respuesta:', result3);
        const json3 = JSON.parse(result3);
        // Nota: un array vacío no es parámetro incompleto, pero la función debería manejarlo. 
        // Actualmente, la validación solo verifica que exista y sea array, no que tenga elementos.
        // Por lo tanto, la función intentará consultar materias y devolverá éxito con 0 materias.
        console.log(json3.success ? '⚠️ Acepta lista vacía (puede ser deseable)' : '✅ Rechaza lista vacía');
        console.assert(json3.success === true, 'Puede aceptar lista vacía');

        // === Caso 4: IDs de materias que no existen ===
        console.log('\n--- Test 4: Materias no existentes ---');
        const result4 = await enviar_formato_prematricula({
            estudiante_id: 1,
            estudiante_nombre: 'Esteban Cárdenas',
            programa_id: 'IS',
            semestre_actual: 5,
            materias_solicitadas: [99999, 88888]
        });
        console.log('Respuesta:', result4);
        const json4 = JSON.parse(result4);
        console.assert(json4.success === false && json4.error.includes('Ninguna de las materias solicitadas fue encontrada'), '✅ Error esperado');

        // === Caso 5: Caso exitoso con materias reales (tomamos IDs de materias existentes) ===
        console.log('\n--- Test 5: Caso exitoso con materias reales ---');
        // Obtener IDs de materias reales del semestre 1 de IS
        const materiasExistentes = await pool.query(`
      SELECT id FROM materias 
      WHERE programa_id = (SELECT id FROM programas WHERE codigo = 'IS')
        AND semestre = 1
      LIMIT 2
    `);
        if (materiasExistentes.rows.length === 0) {
            console.warn('No hay materias de IS semestre 1 para probar éxito');
        } else {
            const materiasIds = materiasExistentes.rows.map(r => r.id);
            const result5 = await enviar_formato_prematricula({
                estudiante_id: 1,
                estudiante_nombre: 'Esteban Cárdenas',
                programa_id: 'IS',
                semestre_actual: 5,
                materias_solicitadas: materiasIds
            });
            console.log('Respuesta:', result5);
            const json5 = JSON.parse(result5);
            console.assert(json5.success === true, '✅ Debería ser exitoso');
            console.assert(json5.data.solicitud.total_materias === materiasIds.length, '✅ Coincide número de materias');
            console.assert(json5.data.solicitud.detalle.length === materiasIds.length, '✅ Detalle completo');
            console.log('Formato generado:', JSON.stringify(json5.data, null, 2));
        }

        // === Caso 6: Simular error de base de datos (opcional: cerrar conexión antes de llamar) ===
        // No implementado para no romper otras pruebas.

    } catch (err) {
        console.error('❌ Error inesperado en las pruebas:', err);
    } finally {
        await pool.end();
    }
}

testEnviarFormato();