// tools/consulta/obtener-resumen-estado.js
import { pool } from '../../scripts/db.js';

/**
 * Obtiene un resumen del estado de asignación de horarios para un programa, jornada y sede.
 * @param {Object} params - Parámetros de la consulta.
 * @param {string} params.programa_id - Código del programa ('IS' o 'IE').
 * @param {string} params.jornada - 'Diurna' o 'Nocturna'.
 * @param {string} [params.sede] - 'NORTE', 'SUR' o null (para grupos virtuales).
 * @returns {Promise<Object>} Resumen con total_grupos, porcentaje_completitud y por_estado.
 * @throws {Error} Si el programa no existe o hay error en la BD.
 */
export async function obtenerResumenEstado({ programa_id, jornada, sede = null }) {
    // Validación básica
    if (!programa_id || !jornada) {
        throw new Error('Faltan parámetros obligatorios: programa_id y jornada');
    }

    const query = `
    WITH grupos_filtrados AS (
      SELECT 
        g.id,
        g.estado AS grupo_estado,
        h.id AS horario_id,
        h.estado AS horario_estado
      FROM grupos g
      JOIN materias m ON m.id = g.materia_id
      JOIN jornadas j ON j.id = g.jornada_id
      LEFT JOIN sedes s ON s.id = g.sede_id
      LEFT JOIN horario_asignado h ON h.grupo_id = g.id AND h.estado <> 'cancelado'
      WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
        AND j.codigo ILIKE $2
        AND (s.codigo ILIKE $3 OR ($3 IS NULL AND g.modalidad = 'virtual'))
        AND g.estado = 'abierto'   -- Solo grupos abiertos
    )
    SELECT
      COUNT(*) AS total_grupos,
      ROUND(100.0 * COUNT(horario_id) / NULLIF(COUNT(*), 0), 2) AS porcentaje_completitud,
      jsonb_build_object(
        'sin_horario', COUNT(*) FILTER (WHERE horario_id IS NULL),
        'propuesto',   COUNT(*) FILTER (WHERE horario_estado = 'propuesto'),
        'confirmado',  COUNT(*) FILTER (WHERE horario_estado = 'confirmado'),
        'conflicto',   COUNT(*) FILTER (WHERE horario_estado = 'conflicto')
      ) AS por_estado
    FROM grupos_filtrados
  `;

    const values = [programa_id, jornada, sede || null];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('programa_not_found');
    }

    return result.rows[0];
}