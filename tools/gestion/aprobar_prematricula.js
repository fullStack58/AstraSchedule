import { pool } from '../../scripts/db.js';

/**
 * Aprueba las asignaturas de la prematrícula de un estudiante, cambiando el estado en las inscripciones.
 * * @param {Object} args
 * @param {number|string} args.solicitud_id - Identificador de la solicitud (mapeado temporalmente a estudiante_id)
 * @param {number|string} args.director_id - Identificador del director de programa que realiza la aprobación
 * @param {Array<number>} args.materias_aprobadas - Listado de IDs de las materias que fueron autorizadas
 * @returns {string} Resultado en formato JSON para el consumo del agente conversacional
 */
export async function aprobar_prematricula({ solicitud_id, director_id, materias_aprobadas }) {
    // Validar consistencia básica de los parámetros de entrada
    if (!solicitud_id || !director_id || !Array.isArray(materias_aprobadas)) {
        return JSON.stringify({
            success: false,
            error: 'Parámetros inválidos o incompletos. Se requiere solicitud_id, director_id y materias_aprobadas[]'
        });
    }

    const client = await pool.connect();

    try {
        // Iniciar transacción para asegurar la atomicidad de todas las actualizaciones
        await client.query('BEGIN');

        const materiasProcesadas = [];

        // Iterar sobre cada materia aprobada por el director
        for (const materiaId of materias_aprobadas) {
            const queryText = `
        UPDATE inscripciones i
        SET estado = 'aprobada'
        FROM grupos g
        WHERE i.grupo_id = g.id
          AND g.materia_id = $1
          AND i.estudiante_id = $2
          AND i.estado = 'activa'
        RETURNING i.id AS inscripcion_id, g.materia_id, i.estado;
      `;

            const res = await client.query(queryText, [materiaId, solicitud_id]);

            if (res.rowCount > 0) {
                materiasProcesadas.push(res.rows[0]);
            }
        }

        // Si ninguna materia coincidió con las inscripciones activas del estudiante
        if (materiasProcesadas.length === 0 && materias_aprobadas.length > 0) {
            await client.query('ROLLBACK');
            return JSON.stringify({
                success: false,
                error: `No se encontraron inscripciones en estado 'activa' para las materias proporcionadas bajo la solicitud/estudiante ${solicitud_id}.`
            });
        }

        // Confirmar los cambios en la base de datos si todo salió bien
        await client.query('COMMIT');

        return JSON.stringify({
            success: true,
            mensaje: `Prematrícula procesada exitosamente por el director (ID: ${director_id}).`,
            solicitud_id: solicitud_id,
            materias_aprobadas_count: materiasProcesadas.length,
            detalles: materiasProcesadas
        });

    } catch (error) {
        // Deshacer cualquier cambio en caso de error
        await client.query('ROLLBACK');
        return JSON.stringify({
            success: false,
            error: `Error en la ejecución de la base de datos: ${error.message}`
        });
    } finally {
        // Liberar el cliente de vuelta al pool
        client.release();
    }
}