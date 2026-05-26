// src/services/grupos.service.js

import { pool } from '../config/db.js';

export async function getAllGrupos({ programa_id, jornada, sede_id, modalidad, estado, semestre }) {
  const { rows } = await pool.query(
    `SELECT
       g.id, g.numero, g.cupo_max, g.modalidad, g.estado, g.requiere_autorizacion,
       m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.semestre, m.creditos,
       p.codigo AS programa_codigo, p.nombre AS programa_nombre,
       j.codigo AS jornada_codigo,
       s.codigo AS sede_codigo,
       per.codigo AS periodo_codigo,
       COUNT(i.id) AS inscripciones_activas,
       ha.id AS horario_id, ha.estado AS horario_estado
     FROM grupos g
     JOIN materias m   ON m.id = g.materia_id
     JOIN programas p  ON p.id = m.programa_id
     JOIN jornadas j   ON j.id = g.jornada_id
     LEFT JOIN sedes s ON s.id = g.sede_id
     JOIN periodos_academicos per ON per.id = g.periodo_id
     LEFT JOIN inscripciones i ON i.grupo_id = g.id AND i.estado = 'activa'
     LEFT JOIN horario_asignado ha ON ha.grupo_id = g.id AND ha.estado <> 'cancelado'
     WHERE per.activo = true
       AND ($1::text IS NULL OR p.codigo = $1)
       AND ($2::text IS NULL OR j.codigo ILIKE $2)
       AND ($3::int IS NULL  OR g.sede_id = $3)
       AND ($4::text IS NULL OR g.modalidad = $4)
       AND ($5::text IS NULL OR g.estado = $5)
       AND ($6::int IS NULL  OR m.semestre = $6)
     GROUP BY g.id, m.id, p.id, j.id, s.id, per.id, ha.id
     ORDER BY m.semestre, m.codigo, g.numero`,
    [programa_id ?? null, jornada ?? null, sede_id ?? null,
     modalidad ?? null, estado ?? null, semestre ?? null]
  );
  return rows;
}

export async function getGrupoById(id) {
  const { rows } = await pool.query(
    `SELECT
       g.id, g.numero, g.cupo_max, g.modalidad, g.estado, g.requiere_autorizacion,
       m.id AS materia_id, m.codigo AS materia_codigo, m.nombre AS materia_nombre,
       m.semestre, m.creditos, m.horas_semana, m.tipo_aula_requerida,
       p.codigo AS programa_codigo, p.nombre AS programa_nombre,
       j.codigo AS jornada_codigo,
       s.codigo AS sede_codigo,
       per.codigo AS periodo_codigo,
       COUNT(i.id) AS inscripciones_activas,
       ha.id AS horario_id, ha.estado AS horario_estado
     FROM grupos g
     JOIN materias m   ON m.id = g.materia_id
     JOIN programas p  ON p.id = m.programa_id
     JOIN jornadas j   ON j.id = g.jornada_id
     LEFT JOIN sedes s ON s.id = g.sede_id
     JOIN periodos_academicos per ON per.id = g.periodo_id
     LEFT JOIN inscripciones i ON i.grupo_id = g.id AND i.estado = 'activa'
     LEFT JOIN horario_asignado ha ON ha.grupo_id = g.id AND ha.estado <> 'cancelado'
     WHERE g.id = $1
     GROUP BY g.id, m.id, p.id, j.id, s.id, per.id, ha.id`,
    [id]
  );
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// src/services/materias.service.js  (embebido aquí para brevedad)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllMaterias({ programa_id, semestre, activa }) {
  const { rows } = await pool.query(
    `SELECT
       m.id, m.codigo, m.nombre, m.semestre, m.creditos,
       m.horas_semana, m.tipo_aula_requerida, m.activa,
       p.codigo AS programa_codigo, p.nombre AS programa_nombre,
       ARRAY_AGG(
         jsonb_build_object('id', mp.id, 'codigo', mp.codigo, 'nombre', mp.nombre)
       ) FILTER (WHERE mp.id IS NOT NULL) AS prerequisitos
     FROM materias m
     JOIN programas p ON p.id = m.programa_id
     LEFT JOIN prerequisitos pr ON pr.materia_id = m.id
     LEFT JOIN materias mp ON mp.id = pr.prerequisito_id
     WHERE ($1::text IS NULL OR p.codigo = $1)
       AND ($2::int IS NULL OR m.semestre = $2)
       AND ($3::boolean IS NULL OR m.activa = $3)
     GROUP BY m.id, p.id
     ORDER BY m.semestre, m.codigo`,
    [programa_id ?? null, semestre ?? null, activa ?? null]
  );
  return rows;
}
