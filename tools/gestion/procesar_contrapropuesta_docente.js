import { pool } from '../../scripts/db.js';

/**
 * Intenta aplicar una contrapropuesta de un docente a un horario existente.
 * @param {Object} args
 * @param {number} args.asignacion_id - ID del horario_asignado
 * @param {number} args.nueva_franja_sugerida - ID de la nueva franja_horaria
 * @param {number} [args.salon_alternativo] - Opcional. ID del nuevo salón
 * @param {string} [args.motivo] - Opcional. Razón del cambio
 */
export async function procesar_contrapropuesta_docente({
    asignacion_id,
    nueva_franja_sugerida,
    salon_alternativo,
    motivo
}) {
    if (!asignacion_id || !nueva_franja_sugerida) {
        return JSON.stringify({ success: false, error: 'Se requiere asignacion_id y nueva_franja_sugerida.' });
    }

    const client = await pool.connect();

    try {
        // Intentamos hacer el UPDATE. Si la nueva franja o salón generan conflicto
        // (ej. solapamiento o aforo), los triggers de la BD lanzarán una excepción.
        const query = `
      UPDATE horario_asignado
      SET 
        franja_id = $2,
        salon_id = COALESCE($3, salon_id),
        estado = 'propuesto' -- Se mantiene como propuesto hasta ser confirmado
      WHERE id = $1
      RETURNING id, grupo_id, docente_id, salon_id, franja_id;
    `;

        const { rows, rowCount } = await client.query(query, [asignacion_id, nueva_franja_sugerida, salon_alternativo || null]);

        if (rowCount === 0) {
            return JSON.stringify({ success: false, error: 'No se encontró la asignación especificada.' });
        }

        return JSON.stringify({
            success: true,
            mensaje: `La contrapropuesta fue viable y se ha actualizado el horario (Aún en estado 'propuesto'). Motivo registrado: ${motivo || 'Ninguno'}`,
            nueva_asignacion: rows[0]
        });

    } catch (error) {
        // Si falla por un trigger (ej. SOLAPAMIENTO_DOCENTE), le avisamos a Groq para que le responda al docente.
        return JSON.stringify({
            success: false,
            error: `La contrapropuesta genera un conflicto en la base de datos: ${error.message.split('\n')[0]}`
        });
    } finally {
        client.release();
    }
}