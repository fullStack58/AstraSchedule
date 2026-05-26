// src/services/horarios.service.js
// Capa de acceso a datos para todo lo relacionado con horarios.
// Extraído y ampliado desde tools/index.js del proyecto original.

import { pool } from '../config/db.js';

// ── CONSULTAS ────────────────────────────────────────────────────────────────

export async function getResumenEstado({ programa_id, jornada, modalidad, sede }) {
  const { rows } = await pool.query(
    `WITH grupos_filtrados AS (
       SELECT g.id, g.materia_id
       FROM grupos g
       JOIN materias m ON m.id = g.materia_id
       JOIN jornadas j  ON j.id = g.jornada_id
       LEFT JOIN sedes s ON s.id = g.sede_id
       WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
         AND j.codigo ILIKE $2
         AND g.modalidad = $3
         AND (
               ($4::text IS NULL AND g.modalidad = 'virtual')
            OR (s.codigo ILIKE $4)
            OR ($4 IS NULL)
         )
     )
     SELECT
       COUNT(*)                                                                 AS total_grupos,
       ROUND(100.0 * COUNT(h.id) / NULLIF(COUNT(*), 0), 2)                     AS porcentaje_completitud,
       COUNT(*) FILTER (WHERE h.id IS NULL)                                     AS sin_horario,
       COUNT(*) FILTER (WHERE h.estado = 'propuesto')                           AS propuesto,
       COUNT(*) FILTER (WHERE h.estado = 'confirmado')                          AS confirmado,
       COUNT(*) FILTER (WHERE h.estado = 'conflicto')                           AS conflicto
     FROM grupos_filtrados g
     LEFT JOIN horario_asignado h
            ON h.grupo_id = g.id AND h.estado <> 'cancelado'`,
    [programa_id, jornada, modalidad, sede ?? null]
  );
  return rows[0];
}

export async function getGruposSinHorario({ programa_id, jornada, semestre, sede }) {
  const { rows } = await pool.query(
    `SELECT
       g.id, g.numero, g.modalidad, g.cupo_max,
       m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.semestre,
       j.codigo AS jornada,
       s.codigo AS sede
     FROM grupos g
     JOIN materias m ON m.id = g.materia_id
     JOIN jornadas j  ON j.id = g.jornada_id
     LEFT JOIN sedes s ON s.id = g.sede_id
     WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
       AND j.codigo ILIKE $2
       AND ($3::int IS NULL OR m.semestre = $3)
       AND (
             ($4::text IS NULL AND g.modalidad = 'virtual')
          OR (s.codigo ILIKE $4)
          OR ($4 IS NULL)
       )
       AND NOT EXISTS (
             SELECT 1 FROM horario_asignado ha
             WHERE ha.grupo_id = g.id AND ha.estado <> 'cancelado'
           )
     ORDER BY m.semestre, m.codigo, g.numero`,
    [programa_id, jornada, semestre ?? null, sede ?? null]
  );
  return rows;
}

export async function getAllHorarios({ estado, programa_id, jornada, sede, limit = 100, offset = 0 }) {
  const { rows } = await pool.query(
    `SELECT
       h.id, h.estado, h.creado_en, h.actualizado_en,
       g.id AS grupo_id, g.numero AS grupo_numero, g.modalidad, g.cupo_max,
       m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.semestre,
       d.id AS docente_id, d.nombre AS docente_nombre, d.tipo AS docente_tipo,
       s.codigo AS salon_codigo, s.capacidad AS salon_capacidad, s.tipo AS salon_tipo,
       se.codigo AS sede_codigo,
       j.codigo AS jornada_codigo,
       f.dia, b.codigo AS bloque_codigo, b.hora_inicio, b.hora_fin,
       p.codigo AS programa_codigo
     FROM horario_asignado h
     JOIN grupos g   ON g.id = h.grupo_id
     JOIN materias m ON m.id = g.materia_id
     JOIN programas p ON p.id = m.programa_id
     JOIN docentes d  ON d.id = h.docente_id
     JOIN salones s   ON s.id = h.salon_id
     LEFT JOIN sedes se ON se.id = s.sede_id
     JOIN jornadas j  ON j.id = g.jornada_id
     JOIN franjas_horarias f ON f.id = h.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE ($1::text IS NULL OR h.estado = $1)
       AND ($2::text IS NULL OR p.codigo = $2)
       AND ($3::text IS NULL OR j.codigo ILIKE $3)
       AND ($4::text IS NULL OR se.codigo ILIKE $4)
     ORDER BY m.semestre, f.dia, b.hora_inicio
     LIMIT $5 OFFSET $6`,
    [estado ?? null, programa_id ?? null, jornada ?? null, sede ?? null, limit, offset]
  );
  return rows;
}

export async function getHorarioById(id) {
  const { rows } = await pool.query(
    `SELECT
       h.id, h.estado, h.creado_en, h.actualizado_en,
       g.id AS grupo_id, g.numero, g.modalidad, g.cupo_max,
       m.codigo AS materia_codigo, m.nombre AS materia_nombre, m.semestre, m.creditos,
       d.id AS docente_id, d.nombre AS docente_nombre, d.tipo AS docente_tipo,
       d.email AS docente_email,
       s.id AS salon_id, s.codigo AS salon_codigo, s.capacidad, s.tipo AS salon_tipo,
       se.codigo AS sede_codigo,
       f.id AS franja_id, f.dia,
       b.codigo AS bloque_codigo, b.hora_inicio, b.hora_fin,
       p.codigo AS programa_codigo, p.nombre AS programa_nombre
     FROM horario_asignado h
     JOIN grupos g   ON g.id = h.grupo_id
     JOIN materias m ON m.id = g.materia_id
     JOIN programas p ON p.id = m.programa_id
     JOIN docentes d  ON d.id = h.docente_id
     JOIN salones s   ON s.id = h.salon_id
     LEFT JOIN sedes se ON se.id = s.sede_id
     JOIN franjas_horarias f ON f.id = h.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE h.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// ── ASIGNACIÓN ────────────────────────────────────────────────────────────────

export async function asignarClase({ grupo_id, docente_id, aula_id, dia, hora_inicio, hora_fin, es_definitiva }) {
  // 1. Resolver franja_id desde (dia, hora_inicio, hora_fin, periodo activo)
  const franja = await pool.query(
    `SELECT f.id FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     WHERE f.dia = $1 AND b.hora_inicio = $2::time AND b.hora_fin = $3::time`,
    [dia, hora_inicio, hora_fin]
  );
  if (franja.rows.length === 0) {
    const err = new Error('Franja horaria no válida o no existe en el periodo activo');
    err.statusCode = 422;
    throw err;
  }

  const estado = es_definitiva ? 'confirmado' : 'propuesto';
  const { rows } = await pool.query(
    `INSERT INTO horario_asignado (grupo_id, docente_id, salon_id, franja_id, estado)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, estado, creado_en`,
    [grupo_id, docente_id, aula_id, franja.rows[0].id, estado]
  );
  return rows[0];
}

export async function cambiarEstadoHorario(id, nuevo_estado, motivo) {
  const { rows, rowCount } = await pool.query(
    `UPDATE horario_asignado
     SET estado = $1, actualizado_en = NOW()
     WHERE id = $2
     RETURNING id, estado, actualizado_en`,
    [nuevo_estado, id]
  );
  if (rowCount === 0) {
    const err = new Error(`Horario #${id} no encontrado`);
    err.statusCode = 404;
    throw err;
  }
  // Si se marca como conflicto, registrar en conflictos_detectados
  if (nuevo_estado === 'conflicto' && motivo) {
    await pool.query(
      `INSERT INTO conflictos_detectados (tipo, descripcion, horario_id)
       VALUES ('docente_no_disponible', $1, $2)`,
      [motivo, id]
    );
  }
  return rows[0];
}

export async function procesarContrapropuesta(asignacion_id, nueva_franja) {
  const franja = await pool.query(
    `SELECT f.id FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE f.dia = $1 AND b.hora_inicio = $2::time AND b.hora_fin = $3::time`,
    [nueva_franja.dia, nueva_franja.hora_inicio, nueva_franja.hora_fin]
  );
  if (franja.rows.length === 0) {
    const err = new Error('Franja sugerida no válida');
    err.statusCode = 422;
    throw err;
  }
  const { rows } = await pool.query(
    `UPDATE horario_asignado
     SET franja_id = $1, estado = 'propuesto', actualizado_en = NOW()
     WHERE id = $2
     RETURNING id, estado`,
    [franja.rows[0].id, asignacion_id]
  );
  return rows[0];
}

// ── PROPUESTA IA ──────────────────────────────────────────────────────────────

export async function proponerHorario({ grupo_id, restricciones = {} }) {
  const grupo = await pool.query(
    `SELECT g.*, m.horas_semana, m.tipo_aula_requerida, m.nombre AS materia_nombre,
            j.codigo AS jornada
     FROM grupos g
     JOIN materias m ON m.id = g.materia_id
     JOIN jornadas j  ON j.id = g.jornada_id
     WHERE g.id = $1`,
    [grupo_id]
  );
  if (grupo.rows.length === 0) {
    const err = new Error('Grupo no existe');
    err.statusCode = 404;
    throw err;
  }

  const { jornada, horas_semana, tipo_aula_requerida, cupo_max, materia_nombre } = grupo.rows[0];
  const numBloques = Math.ceil(horas_semana / 3);

  // Franjas libres compatibles con jornada, periodo activo y sin conflicto
  const franjas = await pool.query(
    `SELECT f.id, b.codigo, f.dia, b.hora_inicio, b.hora_fin, b.orden
     FROM franjas_horarias f
     JOIN bloques_horarios b ON b.id = f.bloque_id
     JOIN jornadas j ON j.id = b.jornada_id
     JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
     WHERE j.codigo ILIKE $1
       AND NOT EXISTS (
         SELECT 1 FROM horario_asignado ha
         WHERE ha.franja_id = f.id AND ha.estado <> 'cancelado'
           AND (ha.salon_id = ANY(SELECT id FROM salones WHERE disponible = true))
       )
     ORDER BY CASE f.dia
       WHEN 'Lunes'     THEN 1 WHEN 'Martes'    THEN 2
       WHEN 'Miercoles' THEN 3 WHEN 'Jueves'    THEN 4
       WHEN 'Viernes'   THEN 5 ELSE 9 END, b.orden
     LIMIT $2`,
    [jornada, numBloques * 2]
  );

  const horarios_propuestos = franjas.rows.slice(0, numBloques).map(f => ({
    franja_id:   f.id,
    dia:         f.dia,
    bloque:      f.codigo,
    hora_inicio: f.hora_inicio,
    hora_fin:    f.hora_fin,
  }));

  return {
    grupo_id,
    materia: materia_nombre,
    jornada,
    bloques_necesarios: numBloques,
    tipo_aula_requerida,
    cupo_max,
    horarios_propuestos,
  };
}

// ── REPORTE ───────────────────────────────────────────────────────────────────

export async function getReporteHorario(grupo_id) {
  const { rows } = await pool.query(
    `SELECT g.numero, m.nombre AS materia, d.nombre AS docente, d.email,
            s.codigo AS salon, se.codigo AS sede, j.codigo AS jornada,
            b.codigo AS bloque, f.dia, b.hora_inicio, b.hora_fin, h.estado
     FROM horario_asignado h
     JOIN grupos g   ON g.id = h.grupo_id
     JOIN materias m ON m.id = g.materia_id
     JOIN jornadas j  ON j.id = g.jornada_id
     JOIN docentes d  ON d.id = h.docente_id
     JOIN salones s   ON s.id = h.salon_id
     LEFT JOIN sedes se ON se.id = s.sede_id
     JOIN franjas_horarias f ON f.id = h.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE g.id = $1
     ORDER BY CASE f.dia
       WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miercoles' THEN 3
       WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 ELSE 9 END, b.hora_inicio`,
    [grupo_id]
  );
  return rows;
}
