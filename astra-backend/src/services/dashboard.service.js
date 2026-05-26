// src/services/dashboard.service.js

import { pool } from '../config/db.js';

export async function getDashboardStats() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM grupos g
        JOIN periodos_academicos p ON p.id = g.periodo_id AND p.activo = true
       )::int                                                AS total_grupos,

       (SELECT COUNT(*) FROM horario_asignado h
        JOIN grupos g ON g.id = h.grupo_id
        JOIN periodos_academicos p ON p.id = g.periodo_id AND p.activo = true
        WHERE h.estado <> 'cancelado'
       )::int                                                AS grupos_con_horario,

       (SELECT COUNT(*) FROM horario_asignado h
        JOIN grupos g ON g.id = h.grupo_id
        JOIN periodos_academicos p ON p.id = g.periodo_id AND p.activo = true
        WHERE h.estado = 'confirmado'
       )::int                                                AS horarios_confirmados,

       (SELECT COUNT(*) FROM conflictos_detectados WHERE NOT resuelto)::int AS conflictos_activos,

       (SELECT COUNT(*) FROM docentes WHERE activo = true)::int             AS docentes_activos,

       (SELECT COUNT(*) FROM salones WHERE disponible = true)::int          AS salones_disponibles,

       (SELECT COUNT(*) FROM estudiantes WHERE activo = true)::int          AS estudiantes_activos,

       (SELECT codigo FROM periodos_academicos WHERE activo = true LIMIT 1)  AS periodo_activo`
  );

  const base = rows[0];
  const completitud = base.total_grupos > 0
    ? Math.round((base.grupos_con_horario / base.total_grupos) * 100 * 10) / 10
    : 0;

  return { ...base, porcentaje_completitud: completitud };
}

export async function getEstadoPorPrograma() {
  const { rows } = await pool.query(
    `SELECT
       p.codigo, p.nombre,
       COUNT(g.id)                                                          AS total_grupos,
       COUNT(h.id)                                                          AS con_horario,
       COUNT(g.id) - COUNT(h.id)                                           AS sin_horario,
       ROUND(100.0 * COUNT(h.id) / NULLIF(COUNT(g.id), 0), 1)             AS porcentaje
     FROM programas p
     LEFT JOIN materias m ON m.programa_id = p.id
     LEFT JOIN grupos g   ON g.materia_id = m.id
       AND g.periodo_id = (SELECT id FROM periodos_academicos WHERE activo = true LIMIT 1)
     LEFT JOIN horario_asignado h ON h.grupo_id = g.id AND h.estado <> 'cancelado'
     GROUP BY p.id
     ORDER BY p.codigo`
  );
  return rows;
}

export async function getEstadoPorJornadaSede() {
  const { rows } = await pool.query(
    `SELECT
       j.codigo AS jornada,
       COALESCE(s.codigo, 'VIRTUAL') AS sede,
       COUNT(g.id)                                                          AS total_grupos,
       COUNT(h.id)                                                          AS con_horario,
       ROUND(100.0 * COUNT(h.id) / NULLIF(COUNT(g.id), 0), 1)             AS porcentaje
     FROM jornadas j
     CROSS JOIN (SELECT id, codigo FROM sedes UNION ALL SELECT NULL, NULL) s
     LEFT JOIN grupos g ON g.jornada_id = j.id
       AND (g.sede_id = s.id OR (s.id IS NULL AND g.modalidad = 'virtual'))
       AND g.periodo_id = (SELECT id FROM periodos_academicos WHERE activo = true LIMIT 1)
     LEFT JOIN horario_asignado h ON h.grupo_id = g.id AND h.estado <> 'cancelado'
     GROUP BY j.id, j.codigo, s.codigo
     HAVING COUNT(g.id) > 0
     ORDER BY j.codigo, s.codigo`
  );
  return rows;
}

export async function getSemanaSede({ sede_codigo, jornada_codigo }) {
  const { rows } = await pool.query(
    `SELECT
       f.dia, b.codigo AS bloque, b.hora_inicio, b.hora_fin,
       h.id AS horario_id, h.estado,
       g.id AS grupo_id, g.numero, g.modalidad,
       m.codigo AS materia_codigo, m.nombre AS materia_nombre,
       d.nombre AS docente_nombre,
       s.codigo AS salon_codigo
     FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN jornadas j ON j.id = b.jornada_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     LEFT JOIN horario_asignado h ON h.franja_id = f.id AND h.estado <> 'cancelado'
     LEFT JOIN grupos g ON g.id = h.grupo_id
     LEFT JOIN materias m ON m.id = g.materia_id
     LEFT JOIN docentes d ON d.id = h.docente_id
     LEFT JOIN salones s ON s.id = h.salon_id
     LEFT JOIN sedes se ON se.id = s.sede_id
     WHERE ($1::text IS NULL OR se.codigo ILIKE $1)
       AND ($2::text IS NULL OR j.codigo ILIKE $2)
     ORDER BY CASE f.dia
       WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miercoles' THEN 3
       WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 ELSE 9 END, b.orden`,
    [sede_codigo ?? null, jornada_codigo ?? null]
  );
  return rows;
}
