// src/services/salones.service.js

import { pool } from '../config/db.js';

export async function getAllSalones({ sede_id, tipo, disponible }) {
  const { rows } = await pool.query(
    `SELECT s.id, s.codigo, s.tipo, s.capacidad, s.bloque, s.disponible,
            se.id AS sede_id, se.codigo AS sede_codigo, se.nombre AS sede_nombre,
            EXISTS (
              SELECT 1 FROM horario_asignado ha
              JOIN franjas_horarias f ON f.id = ha.franja_id
              JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
              WHERE ha.salon_id = s.id AND ha.estado <> 'cancelado'
            ) AS tiene_horarios_activos
     FROM salones s
     JOIN sedes se ON se.id = s.sede_id
     WHERE ($1::int IS NULL OR s.sede_id = $1)
       AND ($2::text IS NULL OR s.tipo = $2)
       AND ($3::boolean IS NULL OR s.disponible = $3)
     ORDER BY se.codigo, s.codigo`,
    [sede_id ?? null, tipo ?? null, disponible ?? null]
  );
  return rows;
}

export async function getAulasDisponibles({ dia, hora_inicio, hora_fin, capacidad_minima = 1, tipo_aula }) {
  const franja = await pool.query(
    `SELECT f.id FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     WHERE f.dia = $1 AND b.hora_inicio = $2::time AND b.hora_fin = $3::time
     LIMIT 1`,
    [dia, hora_inicio, hora_fin]
  );
  if (franja.rows.length === 0) return [];

  const { rows } = await pool.query(
    `SELECT s.id, s.codigo, s.capacidad, s.tipo, s.bloque,
            se.codigo AS sede_codigo, se.nombre AS sede_nombre
     FROM salones s
     JOIN sedes se ON se.id = s.sede_id
     WHERE s.disponible = true
       AND s.capacidad >= $2
       AND ($3::text IS NULL OR s.tipo = $3 OR $3 = 'cualquiera')
       AND NOT EXISTS (
         SELECT 1 FROM horario_asignado ha
         WHERE ha.salon_id = s.id AND ha.franja_id = $1 AND ha.estado <> 'cancelado'
       )
     ORDER BY s.capacidad ASC`,
    [franja.rows[0].id, capacidad_minima, tipo_aula ?? null]
  );
  return rows;
}

export async function getOcupacionSalones() {
  const { rows } = await pool.query(
    `SELECT
       s.id, s.codigo, s.tipo, s.capacidad,
       se.codigo AS sede_codigo,
       COUNT(h.id) AS total_franjas_asignadas,
       ROUND(
         100.0 * COUNT(h.id) /
         NULLIF((SELECT COUNT(*) FROM franjas_horarias f2
                 JOIN periodos_academicos p2 ON p2.id = f2.periodo_id AND p2.activo = true), 0),
         1
       ) AS porcentaje_ocupacion
     FROM salones s
     JOIN sedes se ON se.id = s.sede_id
     LEFT JOIN horario_asignado h ON h.salon_id = s.id AND h.estado <> 'cancelado'
     GROUP BY s.id, se.codigo
     ORDER BY porcentaje_ocupacion DESC`
  );
  return rows;
}
