import pool from '../../scripts/db.js';

/**
 * Confirma definitivamente una asignación de horario.
 * @param {Object} args
 * @param {number} args.asignacion_id_aceptada
 * @param {string} args.confirmado_por - Nombre o rol de quien confirma (ej. 'Docente', 'Director')
 */
export async function bloquear_horario_definitivo({ asignacion_id_aceptada, confirmado_por }) {
  if (!asignacion_id_aceptada || !confirmado_por) {
    return JSON.stringify({ success: false, error: 'Faltan parámetros obligatorios.' });
  }

  try {
    const query = `
      UPDATE horario_asignado
      SET estado = 'confirmado', actualizado_en = NOW()
      WHERE id = $1
      RETURNING id, estado, docente_id, salon_id;
    `;
    
    const { rows, rowCount } = await pool.query(query, [asignacion_id_aceptada]);

    if (rowCount === 0) {
      return JSON.stringify({ success: false, error: 'No se encontró la asignación para confirmar.' });
    }

    return JSON.stringify({
      success: true,
      mensaje: `Horario bloqueado y confirmado exitosamente por: ${confirmado_por}.`,
      detalles: rows[0]
    });

  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
  }
}