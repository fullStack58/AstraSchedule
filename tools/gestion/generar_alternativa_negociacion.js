import pool from '../../scripts/db.js';

/**
 * Busca alternativas viables para un horario rechazado, basándose en la disponibilidad del docente.
 * @param {Object} args
 * @param {number} args.asignacion_id_rechazada
 * @param {string} [args.criterios_prioridad] - Ej: 'Mismo día', 'Jornada diurna'
 */
export async function generar_alternativa_negociacion({ asignacion_id_rechazada, criterios_prioridad }) {
  if (!asignacion_id_rechazada) {
    return JSON.stringify({ success: false, error: 'Falta el ID de la asignación rechazada.' });
  }

  try {
    // 1. Obtener quién es el docente de esa asignación
    const resDocente = await pool.query(
      `SELECT docente_id FROM horario_asignado WHERE id = $1`, 
      [asignacion_id_rechazada]
    );

    if (resDocente.rowCount === 0) {
      return JSON.stringify({ success: false, error: 'Asignación no encontrada.' });
    }
    
    const docente_id = resDocente.rows[0].docente_id;

    // 2. Buscar hasta 3 franjas donde el docente esté disponible y NO tenga clase asignada
    const queryAlternativas = `
      SELECT f.id AS franja_id, f.dia, b.hora_inicio, b.hora_fin, j.nombre AS jornada
      FROM franjas_horarias f
      JOIN bloques_horarios b ON b.id = f.bloque_id
      JOIN jornadas j ON j.id = b.jornada_id
      JOIN disponibilidad_docente dd ON dd.franja_id = f.id
      WHERE dd.docente_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM horario_asignado h 
          WHERE h.franja_id = f.id AND h.docente_id = $1 AND h.estado != 'cancelado'
        )
      LIMIT 3;
    `;

    const alternativas = await pool.query(queryAlternativas, [docente_id]);

    return JSON.stringify({
      success: true,
      mensaje: `Se encontraron ${alternativas.rowCount} alternativas viables basadas en la disponibilidad del docente.`,
      criterios_aplicados: criterios_prioridad || 'Ninguno',
      alternativas: alternativas.rows
    });

  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
  }
}