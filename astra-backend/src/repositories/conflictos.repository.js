import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "uniajc_matriculacion",
  password: "4617",
  port: 5432,
});

// =============================
// REGISTRAR CONFLICTO
// =============================
export async function registrarConflicto({
  tipo,
  descripcion,
  horario_id = null,
}) {

  // EVITAR DUPLICADOS
  const existe = await pool.query(
    `
    SELECT id
    FROM conflictos_detectados
    WHERE tipo = $1
    AND descripcion = $2
    AND resuelto = false
    LIMIT 1;
    `,
    [tipo, descripcion]
  );

  // SI YA EXISTE, NO LO REGISTRA OTRA VEZ
  if (existe.rows.length > 0) {
    return existe.rows[0];
  }

  // INSERTAR NUEVO CONFLICTO
  const query = `
    INSERT INTO conflictos_detectados
    (tipo, descripcion, horario_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [tipo, descripcion, horario_id];

  const result = await pool.query(query, values);

  return result.rows[0];
}

// =============================
// OBTENER TODOS LOS CONFLICTOS
// =============================
export async function obtenerConflictos() {
  const query = `
    SELECT *
    FROM conflictos_detectados
    ORDER BY id DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

// =============================
// DETECTAR CARGA EXCEDIDA
// =============================
export async function detectarCargaExcedida() {
  const query = `
    SELECT
      d.id AS docente_id,
      d.nombre,
      d.carga_max_horas,
      COUNT(h.id) * 3 AS horas_asignadas
    FROM docentes d
    JOIN horario_asignado h
      ON d.id = h.docente_id
    GROUP BY d.id
    HAVING COUNT(h.id) * 3 > d.carga_max_horas;
  `;

  const result = await pool.query(query);

  return result.rows;
}

// =============================
// DETECTAR PRERREQUISITOS
// =============================
export async function detectarPrerequisitos() {
  const query = `
    SELECT
      e.id AS estudiante_id,
      e.nombre,
      m.nombre AS materia,
      mp.nombre AS prerequisito
    FROM inscripciones i
    JOIN estudiantes e
      ON e.id = i.estudiante_id
    JOIN grupos g
      ON g.id = i.grupo_id
    JOIN materias m
      ON m.id = g.materia_id
    JOIN prerequisitos p
      ON p.materia_id = m.id
    JOIN materias mp
      ON mp.id = p.prerequisito_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM inscripciones i2
      JOIN grupos g2
        ON g2.id = i2.grupo_id
      WHERE i2.estudiante_id = e.id
      AND g2.materia_id = p.prerequisito_id
      AND i2.estado = 'aprobada'
    );
  `;

  const result = await pool.query(query);

  return result.rows;
}

// =============================
// MARCAR CONFLICTO COMO RESUELTO
// =============================
export async function resolverConflicto(id) {
  const query = `
    UPDATE conflictos_detectados
    SET resuelto = true
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
}