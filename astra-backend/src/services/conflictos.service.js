// src/services/conflictos.service.js
import { pool } from '../config/db.js';

// Importaciones de los repositorios de tu compañera (Módulo 6)
import {
  detectarCargaExcedida,
  detectarPrerequisitos,
  registrarConflicto,
  obtenerConflictos
} from '../repositories/conflictos.repository.js';


// ==========================================
// FUNCIONES ORIGINALES DEL PROYECTO
// ==========================================

export async function getAllConflictos({ resuelto, tipo, limit = 50 }) {
  const { rows } = await pool.query(
    `SELECT
       cd.id, cd.tipo, cd.descripcion, cd.resuelto, cd.detectado_en,
       h.id AS horario_id, h.estado AS horario_estado,
       g.numero AS grupo_numero,
       m.nombre AS materia_nombre,
       d.nombre AS docente_nombre,
       s.codigo AS salon_codigo
     FROM conflictos_detectados cd
     LEFT JOIN horario_asignado h ON h.id = cd.horario_id
     LEFT JOIN grupos g ON g.id = h.grupo_id
     LEFT JOIN materias m ON m.id = g.materia_id
     LEFT JOIN docentes d ON d.id = h.docente_id
     LEFT JOIN salones s ON s.id = h.salon_id
     WHERE ($1::boolean IS NULL OR cd.resuelto = $1)
       AND ($2::text IS NULL OR cd.tipo = $2)
     ORDER BY cd.detectado_en DESC
     LIMIT $3`,
    [resuelto ?? null, tipo ?? null, limit]
  );
  return rows;
}

export async function resolverConflicto(id) {
  const { rows, rowCount } = await pool.query(
    `UPDATE conflictos_detectados SET resuelto = true WHERE id = $1 RETURNING *`,
    [id]
  );
  if (rowCount === 0) {
    const err = new Error(`Conflicto #${id} no encontrado`);
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

export async function getResumenConflictos() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE NOT resuelto)                             AS activos,
       COUNT(*) FILTER (WHERE resuelto)                                 AS resueltos,
       COUNT(*) FILTER (WHERE NOT resuelto AND tipo IN ('aula_solapada','docente_solapado')) AS criticos,
       jsonb_object_agg(tipo, cnt) AS por_tipo
     FROM (
       SELECT tipo, COUNT(*) AS cnt FROM conflictos_detectados WHERE NOT resuelto GROUP BY tipo
     ) sub, conflictos_detectados`
  );
  return rows[0];
}

export async function detectarConflictosActivos() {
  const { rows } = await pool.query(
    `-- Aulas solapadas: mismo salón, misma franja, distinto grupo
     SELECT 'aula_solapada' AS tipo,
            CONCAT('Salón ', s.codigo, ' doble-asignado en franja ', f.dia, ' ', b.codigo) AS descripcion,
            h1.id AS horario_id
     FROM horario_asignado h1
     JOIN horario_asignado h2 ON h2.salon_id = h1.salon_id
          AND h2.franja_id = h1.franja_id AND h2.id <> h1.id
          AND h2.estado <> 'cancelado'
     JOIN salones s ON s.id = h1.salon_id
     JOIN franjas_horarias f ON f.id = h1.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE h1.estado <> 'cancelado'

     UNION ALL

     -- Docentes solapados: mismo docente, misma franja
     SELECT 'docente_solapado',
            CONCAT('Docente ', d.nombre, ' asignado doble en franja ', f.dia, ' ', b.codigo),
            h1.id
     FROM horario_asignado h1
     JOIN horario_asignado h2 ON h2.docente_id = h1.docente_id
          AND h2.franja_id = h1.franja_id AND h2.id <> h1.id
          AND h2.estado <> 'cancelado'
     JOIN docentes d ON d.id = h1.docente_id
     JOIN franjas_horarias f ON f.id = h1.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     WHERE h1.estado <> 'cancelado'

     UNION ALL

     -- Carga docente excedida
     SELECT 'carga_docente_excedida',
            CONCAT('Docente ', d.nombre, ' (', d.tipo, '): ',
                   ROUND(SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio))/3600)::numeric,1),
                   'h / ', d.carga_max_horas, 'h máx'),
            NULL
     FROM docentes d
     JOIN horario_asignado h ON h.docente_id = d.id AND h.estado <> 'cancelado'
     JOIN franjas_horarias f ON f.id = h.franja_id
     JOIN bloques_horarios b ON b.id = f.bloque_id
     GROUP BY d.id, d.nombre, d.tipo, d.carga_max_horas
     HAVING SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio))/3600) > d.carga_max_horas`
  );
  return rows;
}


// ==========================================
// NUEVAS FUNCIONES INTEGRADAS (MÓDULO 6)
// ==========================================

export async function analizarCargaExcedida() {
  const conflictos = await detectarCargaExcedida();

  for (const conflicto of conflictos) {
    await registrarConflicto({
      tipo: "carga_docente_excedida",
      descripcion: `El docente ${conflicto.nombre} tiene ${conflicto.horas_asignadas} horas asignadas, superando su límite de ${conflicto.carga_max_horas}.`,
    });
  }
  return conflictos;
}

export async function analizarPrerequisitos() {
  const conflictos = await detectarPrerequisitos();

  for (const conflicto of conflictos) {
    await registrarConflicto({
      tipo: "prerequisito_no_cumplido",
      descripcion: `El estudiante ${conflicto.nombre} no cumple con el prerrequisito '${conflicto.prerequisito}' para ver la materia '${conflicto.materia}'.`,
    });
  }
  return conflictos;
}

export async function obtenerAuditoria() {
  return await obtenerConflictos();
}