import pool from '../../scripts/db.js';

/**
 * Genera un reporte estadístico global de la asignación de horarios.
 * @param {Object} args
 * @param {number} [args.periodo_id] - Opcional. ID del periodo a filtrar.
 * @param {string} [args.programa_id] - Opcional. Código del programa (IS, IE).
 */
export async function generar_reporte_horario({ periodo_id, programa_id }) {
  const client = await pool.connect();

  try {
    // Construimos filtros dinámicos
    let filtroAdicional = '';
    const valores = [];
    let contadorParams = 1;

    if (periodo_id) {
      filtroAdicional += ` AND g.periodo_id = $${contadorParams}`;
      valores.push(periodo_id);
      contadorParams++;
    }

    if (programa_id) {
      filtroAdicional += ` AND p.codigo = $${contadorParams}`;
      valores.push(programa_id);
      contadorParams++;
    }

    // Consulta para obtener la estadística general de estados
    const queryEstados = `
      SELECT h.estado, COUNT(h.id)::int as total
      FROM horario_asignado h
      JOIN grupos g ON g.id = h.grupo_id
      JOIN materias m ON m.id = g.materia_id
      JOIN programas p ON p.id = m.programa_id
      WHERE 1=1 ${filtroAdicional}
      GROUP BY h.estado;
    `;

    // Consulta para obtener el top de docentes con más carga asignada (para el reporte)
    const queryCarga = `
      SELECT d.nombre, SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio))/3600)::numeric AS horas_asignadas
      FROM horario_asignado h
      JOIN docentes d ON d.id = h.docente_id
      JOIN franjas_horarias f ON f.id = h.franja_id
      JOIN bloques_horarios b ON b.id = f.bloque_id
      JOIN grupos g ON g.id = h.grupo_id
      JOIN materias m ON m.id = g.materia_id
      JOIN programas p ON p.id = m.programa_id
      WHERE h.estado != 'cancelado' ${filtroAdicional}
      GROUP BY d.nombre
      ORDER BY horas_asignadas DESC
      LIMIT 5;
    `;

    const resEstados = await client.query(queryEstados, valores);
    const resCarga = await client.query(queryCarga, valores);

    const desgloseEstados = resEstados.rows.reduce((acc, row) => {
      acc[row.estado] = row.total;
      return acc;
    }, {});

    const totalAsignaciones = resEstados.rows.reduce((sum, row) => sum + row.total, 0);

    return JSON.stringify({
      success: true,
      mensaje: "Reporte de horarios generado correctamente.",
      filtros_aplicados: { periodo_id: periodo_id || 'Todos', programa_id: programa_id || 'Todos' },
      estadisticas: {
        total_asignaciones_registradas: totalAsignaciones,
        desglose_por_estado: desgloseEstados,
        docentes_con_mayor_carga: resCarga.rows
      }
    });

  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
  } finally {
    client.release();
  }
}