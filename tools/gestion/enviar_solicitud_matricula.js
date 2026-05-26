import { pool } from '../../scripts/db.js';

/**
 * Procesa la solicitud inicial de matrícula de un estudiante, buscando los grupos
 * correspondientes a las materias solicitadas y registrando la inscripción.
 * @param {Object} args
 * @param {number|string} args.estudiante_id
 * @param {number|string} args.periodo_id
 * @param {Array<number>} args.materias - IDs de las materias a matricular
 */
export async function enviar_solicitud_matricula({ estudiante_id, periodo_id, materias }) {
    if (!estudiante_id || !periodo_id || !Array.isArray(materias) || materias.length === 0) {
        return JSON.stringify({
            success: false,
            error: 'Parámetros incompletos. Se requiere estudiante_id, periodo_id y el arreglo de materias[].'
        });
    }

    const client = await pool.connect();
    const resultados = {
        exitosas: [],
        fallidas: []
    };

    try {
        await client.query('BEGIN');

        for (const materiaId of materias) {
            // 1. Buscar un grupo disponible que cumpla con la sede/jornada del estudiante
            // o que sea modalidad virtual.
            const queryGrupo = `
        SELECT g.id AS grupo_id, g.numero, m.nombre AS materia_nombre
        FROM grupos g
        JOIN estudiantes e ON e.id = $1
        JOIN materias m ON m.id = g.materia_id
        WHERE g.materia_id = $2
          AND g.periodo_id = $3
          AND g.jornada_id = e.jornada_id
          AND (g.modalidad = 'virtual' OR g.sede_id = e.sede_id)
          AND g.estado = 'abierto'
        LIMIT 1;
      `;

            const resGrupo = await client.query(queryGrupo, [estudiante_id, materiaId, periodo_id]);

            if (resGrupo.rowCount === 0) {
                // Consultamos el nombre de la materia para dar un error más claro
                const resMat = await client.query('SELECT nombre FROM materias WHERE id = $1', [materiaId]);
                const nombreMat = resMat.rowCount > 0 ? resMat.rows[0].nombre : `ID ${materiaId}`;

                resultados.fallidas.push({
                    materia_id: materiaId,
                    materia_nombre: nombreMat,
                    razon: 'No hay grupos abiertos disponibles en su sede/jornada para este periodo.'
                });
                continue; // Pasamos a la siguiente materia
            }

            const grupo = resGrupo.rows[0];

            // 2. Intentar la inserción en inscripciones
            // Aquí entrarán a jugar los triggers (Paz y salvo, Prerrequisitos, etc.)
            try {
                await client.query(
                    `INSERT INTO inscripciones (estudiante_id, grupo_id, estado) VALUES ($1, $2, 'activa')`,
                    [estudiante_id, grupo.grupo_id]
                );

                resultados.exitosas.push({
                    materia_id: materiaId,
                    materia_nombre: grupo.materia_nombre,
                    grupo_asignado: grupo.numero
                });
            } catch (dbError) {
                // Capturamos el error específico del trigger (ej. SIN_PAZ_Y_SALVO)
                resultados.fallidas.push({
                    materia_id: materiaId,
                    materia_nombre: grupo.materia_nombre,
                    razon: dbError.message.split('\n')[0] // Tomamos solo la primera línea del error de Postgres
                });
            }
        }

        await client.query('COMMIT');

        return JSON.stringify({
            success: true,
            mensaje: `Solicitud procesada. ${resultados.exitosas.length} procesadas con éxito, ${resultados.fallidas.length} fallidas.`,
            detalles: resultados
        });

    } catch (error) {
        await client.query('ROLLBACK');
        return JSON.stringify({
            success: false,
            error: `Error crítico al procesar la solicitud: ${error.message}`
        });
    } finally {
        client.release();
    }
}