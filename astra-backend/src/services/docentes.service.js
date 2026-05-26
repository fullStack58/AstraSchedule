// src/services/docentes.service.js

import { pool } from '../config/db.js';

export async function getAllDocentes({ tipo, disponibilidad, activo = true }) {
  const { rows } = await pool.query(
    `SELECT
       d.id, d.identificacion, d.nombre, d.email, d.tipo, d.carga_max_horas,
       d.disponibilidad, d.activo,
       COALESCE(SUM(
         EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600
       ), 0)::numeric(5,1) AS horas_asignadas,
       d.carga_max_horas - COALESCE(SUM(
         EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600
       ), 0) AS horas_disponibles
     FROM docentes d
     LEFT JOIN horario_asignado h  ON h.docente_id = d.id AND h.estado <> 'cancelado'
     LEFT JOIN franjas_horarias f  ON f.id = h.franja_id
     LEFT JOIN bloques_horarios b  ON b.id = f.bloque_id
     WHERE ($1::text IS NULL OR d.tipo = $1)
       AND ($2::text IS NULL OR d.disponibilidad ILIKE $2)
       AND d.activo = $3
     GROUP BY d.id
     ORDER BY d.nombre`,
    [tipo ?? null, disponibilidad ?? null, activo]
  );
  return rows;
}

export async function getDocenteById(id) {
  const { rows } = await pool.query(
    `SELECT
       d.*,
       COALESCE(SUM(
         EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600
       ), 0)::numeric(5,1) AS horas_asignadas,
       ARRAY_AGG(
         DISTINCT jsonb_build_object(
           'dia', f.dia, 'bloque', b.codigo,
           'hora_inicio', b.hora_inicio, 'hora_fin', b.hora_fin
         )
       ) FILTER (WHERE f.id IS NOT NULL) AS franjas_asignadas
     FROM docentes d
     LEFT JOIN horario_asignado h ON h.docente_id = d.id AND h.estado <> 'cancelado'
     LEFT JOIN franjas_horarias f ON f.id = h.franja_id
     LEFT JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE d.id = $1
     GROUP BY d.id`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getCargaDocente(docente_id) {
  const { rows } = await pool.query(
    `SELECT
       d.id, d.nombre, d.tipo, d.carga_max_horas,
       COALESCE(SUM(
         EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600
       ), 0)::numeric(5,1) AS horas_asignadas,
       COUNT(h.id) AS total_asignaciones
     FROM docentes d
     LEFT JOIN horario_asignado h ON h.docente_id = d.id AND h.estado <> 'cancelado'
     LEFT JOIN franjas_horarias f ON f.id = h.franja_id
     LEFT JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE d.id = $1
     GROUP BY d.id, d.carga_max_horas`,
    [docente_id]
  );
  return rows[0] ?? null;
}

export async function getDocentesConSobrecarga() {
  const { rows } = await pool.query(
    `SELECT
       d.id, d.nombre, d.email, d.tipo, d.carga_max_horas,
       ROUND(SUM(
         EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600
       )::numeric, 1) AS horas_asignadas
     FROM docentes d
     JOIN horario_asignado h ON h.docente_id = d.id AND h.estado <> 'cancelado'
     JOIN franjas_horarias f ON f.id = h.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE d.activo = true
     GROUP BY d.id
     HAVING SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)) / 3600) > d.carga_max_horas
     ORDER BY horas_asignadas DESC`
  );
  return rows;
}

export async function getDocentesDisponibles({ dia, hora_inicio, hora_fin, materia_id }) {
  // Resolver franja correspondiente
  const franja = await pool.query(
    `SELECT f.id, j.codigo AS jornada FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN jornadas j ON j.id = b.jornada_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     WHERE f.dia = $1 AND b.hora_inicio = $2::time AND b.hora_fin = $3::time
     LIMIT 1`,
    [dia, hora_inicio, hora_fin]
  );
  if (franja.rows.length === 0) return [];

  const { id: franja_id, jornada } = franja.rows[0];

  const { rows } = await pool.query(
    `SELECT
       d.id, d.nombre, d.email, d.tipo, d.disponibilidad, d.carga_max_horas,
       COALESCE(SUM(
         EXTRACT(EPOCH FROM (b2.hora_fin - b2.hora_inicio)) / 3600
       ), 0)::numeric(5,1) AS horas_asignadas
     FROM docentes d
     LEFT JOIN horario_asignado h2 ON h2.docente_id = d.id AND h2.estado <> 'cancelado'
     LEFT JOIN franjas_horarias f2 ON f2.id = h2.franja_id
     LEFT JOIN bloques_horarios b2 ON b2.id = f2.bloque_id
     WHERE d.activo = true
       AND d.disponibilidad IN ('Ambas', $2)
       AND EXISTS (
         SELECT 1 FROM disponibilidad_docente dd WHERE dd.docente_id = d.id AND dd.franja_id = $1
       )
       AND NOT EXISTS (
         SELECT 1 FROM horario_asignado ha WHERE ha.docente_id = d.id
           AND ha.franja_id = $1 AND ha.estado <> 'cancelado'
       )
     GROUP BY d.id
     ORDER BY horas_asignadas ASC`,
    [franja_id, jornada]
  );
  return rows;
}

export async function getDisponibilidadDocente(docente_id) {
  const { rows } = await pool.query(
    `SELECT f.dia, b.codigo AS bloque, b.hora_inicio, b.hora_fin, j.codigo AS jornada,
            EXISTS (
              SELECT 1 FROM horario_asignado ha
              WHERE ha.docente_id = $1 AND ha.franja_id = f.id AND ha.estado <> 'cancelado'
            ) AS ocupado
     FROM disponibilidad_docente dd
     JOIN franjas_horarias f ON f.id = dd.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN jornadas j ON j.id = b.jornada_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     WHERE dd.docente_id = $1
     ORDER BY CASE f.dia
       WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miercoles' THEN 3
       WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 ELSE 9 END, b.orden`,
    [docente_id]
  );
  return rows;
}
