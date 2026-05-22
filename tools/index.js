// tools/index.js
import { pool } from '../scripts/db.js';

// Tools
export * from './consulta/obtener-resumen-estado.js';


// ──────────────────────────────────────────────────────────────
// 1. CONSULTA
// ──────────────────────────────────────────────────────────────
async function obtenerResumenEstado({ programa_id, jornada, sede }) {
    const result = await pool.query(`
    WITH grupos_filtrados AS (
      SELECT g.*, m.programa_id
      FROM grupos g
      JOIN materias m ON m.id = g.materia_id
      JOIN jornadas j ON j.id = g.jornada_id
      LEFT JOIN sedes s ON s.id = g.sede_id
      WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
        AND j.codigo ILIKE $2
        AND (s.codigo ILIKE $3 OR ($3 IS NULL AND g.modalidad='virtual'))
    )
    SELECT
      COUNT(*) AS total_grupos,
      ROUND(100.0 * COUNT(h.id) / NULLIF(COUNT(*), 0), 2) AS porcentaje_completitud,
      jsonb_build_object(
        'sin_horario', COUNT(*) FILTER (WHERE h.id IS NULL),
        'propuesto',   COUNT(*) FILTER (WHERE h.estado = 'propuesto'),
        'confirmado',  COUNT(*) FILTER (WHERE h.estado = 'confirmado'),
        'conflicto',   COUNT(*) FILTER (WHERE h.estado = 'conflicto')
      ) AS por_estado
    FROM grupos_filtrados g
    LEFT JOIN horario_asignado h ON h.grupo_id = g.id AND h.estado <> 'cancelado'
  `, [programa_id, jornada, sede]);

    if (result.rows.length === 0) throw new Error('programa_not_found');
    return result.rows[0];
}

async function listarGruposSinHorario({ programa_id, semestre, jornada, sede }) {
    const res = await pool.query(`
    SELECT g.id, m.codigo, g.numero, j.codigo AS jornada, g.modalidad, s.codigo AS sede
    FROM grupos g
    JOIN materias m ON m.id = g.materia_id
    JOIN jornadas j ON j.id = g.jornada_id
    LEFT JOIN sedes s ON s.id = g.sede_id
    WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
      AND m.semestre = ANY($2::int[])
      AND j.codigo ILIKE $3
      AND (s.codigo ILIKE $4 OR ($4 IS NULL AND g.modalidad='virtual'))
      AND NOT EXISTS (SELECT 1 FROM horario_asignado ha WHERE ha.grupo_id = g.id)
  `, [programa_id, semestre, jornada, sede]);
    return res.rows;
}

async function listarAsignaturasPorSemestre({ programa_id, semestre }) {
    const res = await pool.query(`
    SELECT m.id, m.codigo, m.nombre, m.semestre, m.creditos, m.horas_semana
    FROM materias m
    WHERE m.programa_id = (SELECT id FROM programas WHERE codigo = $1)
      AND m.semestre = $2
      AND m.activa = true
    ORDER BY m.codigo
  `, [programa_id, semestre]);
    return res.rows;
}

async function obtenerDocentesDisponibles({ materia_id, programa_id, dia, hora_inicio, hora_fin }) {
    // obtener franja que coincide con dia y hora (dentro de bloque de 3h)
    const franja = await pool.query(`
    SELECT f.id FROM franjas_horarias f
    JOIN bloques_horarios b ON b.id = f.bloque_id
    JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
    WHERE f.dia = $1 AND b.hora_inicio <= $2 AND b.hora_fin >= $3
  `, [dia, hora_inicio, hora_fin]);
    if (franja.rows.length === 0) return [];

    const res = await pool.query(`
    SELECT d.id, d.nombre, d.tipo, d.carga_max_horas
    FROM docentes d
    WHERE d.activo = true
      AND EXISTS (SELECT 1 FROM disponibilidad_docente dd WHERE dd.docente_id = d.id AND dd.franja_id = $1)
      AND d.disponibilidad IN ('Ambas', (SELECT j.codigo FROM jornadas j JOIN bloques_horarios b ON b.jornada_id = j.id WHERE b.id = (SELECT bloque_id FROM franjas_horarias WHERE id = $1)))
  `, [franja.rows[0].id]);
    return res.rows;
}

async function obtenerCargaDocente({ docente_id }) {
    const res = await pool.query(`
    SELECT
      COALESCE(SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio))/3600), 0) AS horas_asignadas,
      d.carga_max_horas,
      d.tipo
    FROM docentes d
    LEFT JOIN horario_asignado h ON h.docente_id = d.id AND h.estado <> 'cancelado'
    LEFT JOIN franjas_horarias f ON f.id = h.franja_id
    LEFT JOIN bloques_horarios b ON b.id = f.bloque_id
    WHERE d.id = $1
    GROUP BY d.id, d.carga_max_horas, d.tipo
  `, [docente_id]);
    return res.rows[0] || { horas_asignadas: 0, carga_max_horas: 0, tipo: null };
}

async function obtenerAulasDisponibles({ dia, hora_inicio, hora_fin, capacidad_minima, tipo_aula }) {
    const franja = await pool.query(`
    SELECT f.id FROM franjas_horarias f
    JOIN bloques_horarios b ON b.id = f.bloque_id
    JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
    WHERE f.dia = $1 AND b.hora_inicio <= $2 AND b.hora_fin >= $3
  `, [dia, hora_inicio, hora_fin]);
    if (franja.rows.length === 0) return [];

    const res = await pool.query(`
    SELECT s.id, s.codigo, s.capacidad, s.tipo, se.codigo AS sede
    FROM salones s
    JOIN sedes se ON se.id = s.sede_id
    WHERE s.disponible = true
      AND s.capacidad >= $2
      AND ($3 IS NULL OR s.tipo = $3 OR $3 = 'cualquiera')
      AND NOT EXISTS (
        SELECT 1 FROM horario_asignado h
        WHERE h.salon_id = s.id AND h.franja_id = $1 AND h.estado <> 'cancelado'
      )
  `, [franja.rows[0].id, capacidad_minima, tipo_aula]);
    return res.rows;
}

// ──────────────────────────────────────────────────────────────
// 2. GENERACIÓN
// ──────────────────────────────────────────────────────────────
async function evaluarFusionGrupos({ grupos_ids }) {
    // Obtener grupos y sus estudiantes (simulado por cupo_max)
    const grupos = await pool.query(`
    SELECT g.id, g.cupo_max, m.nombre AS materia, j.codigo AS jornada, g.modalidad
    FROM grupos g
    JOIN materias m ON m.id = g.materia_id
    JOIN jornadas j ON j.id = g.jornada_id
    WHERE g.id = ANY($1::int[])
  `, [grupos_ids]);

    const totalEstudiantes = grupos.rows.reduce((sum, g) => sum + g.cupo_max, 0);
    const jornada = grupos.rows[0]?.jornada;
    const modalidad = grupos.rows[0]?.modalidad;

    // Buscar salón que pueda albergar a todos juntos
    const salon = await pool.query(`
    SELECT id, codigo, capacidad
    FROM salones
    WHERE capacidad >= $1 AND ($2 = 'virtual' OR tipo = 'presencial')
    ORDER BY capacidad ASC
    LIMIT 1
  `, [totalEstudiantes, modalidad]);

    return {
        fusion_posible: salon.rows.length > 0,
        total_estudiantes: totalEstudiantes,
        salon_sugerido: salon.rows[0] || null,
        jornada,
        observacion: salon.rows.length === 0 ? 'No hay salón con suficiente capacidad' : null
    };
}

async function proponerHorario({ grupo_id, restricciones = {} }) {
    // Obtener información del grupo
    const grupo = await pool.query(`
    SELECT g.*, m.horas_semana, m.tipo_aula_requerida, j.codigo AS jornada
    FROM grupos g
    JOIN materias m ON m.id = g.materia_id
    JOIN jornadas j ON j.id = g.jornada_id
    WHERE g.id = $1
  `, [grupo_id]);
    if (grupo.rows.length === 0) throw new Error('Grupo no existe');

    const { jornada, horas_semana, tipo_aula_requerida, cupo_max } = grupo.rows[0];
    const numBloques = Math.ceil(horas_semana / 3); // bloques de 3h

    // Buscar franjas horarias compatibles con la jornada
    const franjas = await pool.query(`
    SELECT f.id, b.codigo, f.dia, b.hora_inicio, b.hora_fin
    FROM franjas_horarias f
    JOIN bloques_horarios b ON b.id = f.bloque_id
    JOIN jornadas j ON j.id = b.jornada_id
    JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
    WHERE j.codigo ILIKE $1
    ORDER BY f.id
  `, [jornada]);

    // Aquí iría un algoritmo de optimización (simplificado: selecciona primeras N franjas libres)
    const horariosPropuestos = [];
    for (let i = 0; i < Math.min(numBloques, franjas.rows.length); i++) {
        horariosPropuestos.push({
            franja_id: franjas.rows[i].id,
            dia: franjas.rows[i].dia,
            bloque: franjas.rows[i].codigo,
            hora_inicio: franjas.rows[i].hora_inicio,
            hora_fin: franjas.rows[i].hora_fin
        });
    }
    return { grupo_id, jornada, bloques_necesarios: numBloques, horarios_propuestos: horariosPropuestos };
}

async function asignarClase({ grupo_id, docente_id, aula_id, dia, hora_inicio, hora_fin, es_definitiva = false }) {
    // Obtener franja_id exacta
    const franja = await pool.query(`
    SELECT f.id FROM franjas_horarias f
    JOIN bloques_horarios b ON b.id = f.bloque_id
    JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
    WHERE f.dia = $1 AND b.hora_inicio = $2 AND b.hora_fin = $3
  `, [dia, hora_inicio, hora_fin]);
    if (franja.rows.length === 0) throw new Error('Franja horaria no válida');

    const estado = es_definitiva ? 'confirmado' : 'propuesto';

    const result = await pool.query(`
    INSERT INTO horario_asignado (grupo_id, docente_id, salon_id, franja_id, estado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [grupo_id, docente_id, aula_id, franja.rows[0].id, estado]);

    return { id: result.rows[0].id, estado, mensaje: 'Asignación registrada exitosamente' };
}

async function detectarConflictos({ horario_id } = {}) {
    let conflictos = [];
    if (horario_id) {
        // Analizar un horario específico
        const horario = await pool.query(`SELECT * FROM horario_asignado WHERE id = $1`, [horario_id]);
        if (horario.rows.length === 0) throw new Error('Horario no encontrado');
        // Los triggers ya lanzan excepciones, aquí simulamos revisión adicional
        conflictos = await verificarConflictosHorario(horario.rows[0]);
    } else {
        // Analizar todos los horarios del periodo activo
        const todos = await pool.query(`SELECT * FROM horario_asignado WHERE estado <> 'cancelado'`);
        for (const h of todos.rows) {
            const c = await verificarConflictosHorario(h);
            conflictos.push(...c);
        }
    }
    return conflictos;
}

async function verificarConflictosHorario(horario) {
    // Función auxiliar que revisa restricciones duras (devuelve array de conflictos)
    const conflicts = [];
    // Ejemplo: verificar capacidad
    const capacidad = await pool.query(`
    SELECT s.capacidad, COUNT(i.id) AS inscritos
    FROM salones s
    JOIN horario_asignado h ON h.salon_id = s.id
    JOIN grupos g ON g.id = h.grupo_id
    LEFT JOIN inscripciones i ON i.grupo_id = g.id AND i.estado='activa'
    WHERE h.id = $1
    GROUP BY s.capacidad
  `, [horario.id]);
    if (capacidad.rows[0] && capacidad.rows[0].inscritos > capacidad.rows[0].capacidad) {
        conflicts.push({ tipo: 'capacidad_excedida', descripcion: 'Aforo insuficiente', horario_id: horario.id });
    }
    // ... más reglas
    return conflicts;
}

// ──────────────────────────────────────────────────────────────
// 3. GESTIÓN
// ──────────────────────────────────────────────────────────────
async function solicitarAprobacion({ horario_id, destinatario }) {
    // Simula envío de notificación (se registra en tabla de notificaciones o simplemente retorna éxito)
    return { status: 'pendiente', destinatario, horario_id, mensaje: 'Solicitud de aprobación enviada' };
}

async function cambiarEstadoAsignacion({ asignacion_id, nuevo_estado, motivo }) {
    const res = await pool.query(`
    UPDATE horario_asignado
    SET estado = $1, actualizado_en = NOW()
    WHERE id = $2
    RETURNING id, estado
  `, [nuevo_estado, asignacion_id]);
    if (res.rowCount === 0) throw new Error('Asignación no encontrada');
    return res.rows[0];
}

async function registrarRechazoDocente({ asignacion_id, motivo, docente_id }) {
    const res = await pool.query(`
    UPDATE horario_asignado
    SET estado = 'conflicto', actualizado_en = NOW()
    WHERE id = $1 AND docente_id = $2
    RETURNING id
  `, [asignacion_id, docente_id]);
    if (res.rowCount === 0) throw new Error('No se pudo registrar el rechazo');
    // Registrar en conflictos_detectados
    await pool.query(`
    INSERT INTO conflictos_detectados (tipo, descripcion, horario_id)
    VALUES ('docente_no_disponible', $1, $2)
  `, [motivo, asignacion_id]);
    return { success: true, mensaje: 'Rechazo registrado' };
}

async function procesarContrapropuestaDocente({ asignacion_id, nueva_franja_sugerida }) {
    // nueva_franja_sugerida = { dia, hora_inicio, hora_fin }
    const franja = await pool.query(`
    SELECT f.id FROM franjas_horarias f
    JOIN bloques_horarios b ON b.id = f.bloque_id
    WHERE f.dia = $1 AND b.hora_inicio = $2 AND b.hora_fin = $3
  `, [nueva_franja_sugerida.dia, nueva_franja_sugerida.hora_inicio, nueva_franja_sugerida.hora_fin]);
    if (franja.rows.length === 0) throw new Error('Franja sugerida no válida');

    await pool.query(`
    UPDATE horario_asignado
    SET franja_id = $1, estado = 'propuesto', actualizado_en = NOW()
    WHERE id = $2
  `, [franja.rows[0].id, asignacion_id]);
    return { success: true, mensaje: 'Contrapropuesta aplicada' };
}

// ──────────────────────────────────────────────────────────────
// 4. NOTIFICACIONES
// ──────────────────────────────────────────────────────────────
// (Se pueden implementar con envío de correo real, aquí simulamos)
async function notificarDocente({ docente_id, mensaje, asunto }) {
    console.log(`📧 NOTIFICACIÓN a docente ${docente_id}: ${asunto} - ${mensaje}`);
    return { enviado: true, canal: 'email_simulado' };
}
async function notificarEstudiante({ estudiante_id, mensaje, asunto }) { /* similar */ }
async function notificarDirector({ director_email, mensaje, asunto }) { /* similar */ }

// ──────────────────────────────────────────────────────────────
// 5. REPORTES
// ──────────────────────────────────────────────────────────────
async function generarReporteHorario({ grupo_id, periodo_id }) {
    const res = await pool.query(`
    SELECT g.numero, m.nombre AS materia, d.nombre AS docente, s.codigo AS salon,
           b.codigo AS bloque, f.dia, b.hora_inicio, b.hora_fin, h.estado
    FROM horario_asignado h
    JOIN grupos g ON g.id = h.grupo_id
    JOIN materias m ON m.id = g.materia_id
    JOIN docentes d ON d.id = h.docente_id
    JOIN salones s ON s.id = h.salon_id
    JOIN franjas_horarias f ON f.id = h.franja_id
    JOIN bloques_horarios b ON b.id = f.bloque_id
    WHERE g.id = $1 AND g.periodo_id = $2
    ORDER BY f.dia, b.hora_inicio
  `, [grupo_id, periodo_id]);
    return res.rows;
}

async function generarDashboard({ programa_id, periodo_id }) {
    const res = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM grupos WHERE periodo_id = $2) AS total_grupos,
      (SELECT COUNT(*) FROM horario_asignado WHERE estado='confirmado') AS horarios_confirmados,
      (SELECT COUNT(*) FROM conflictos_detectados WHERE NOT resuelto) AS conflictos_abiertos
  `, [programa_id, periodo_id]);
    return res.rows[0];
}

// Exportar todas las tools
export {
    // Consulta
    obtenerResumenEstado,
    listarGruposSinHorario,
    listarAsignaturasPorSemestre,
    obtenerDocentesDisponibles,
    obtenerCargaDocente,
    obtenerAulasDisponibles,
    // Generación
    evaluarFusionGrupos,
    proponerHorario,
    asignarClase,
    detectarConflictos,
    // Gestión
    solicitarAprobacion,
    cambiarEstadoAsignacion,
    registrarRechazoDocente,
    procesarContrapropuestaDocente,
    // Notificaciones
    notificarDocente,
    notificarEstudiante,
    notificarDirector,
    // Reportes
    generarReporteHorario,
    generarDashboard
};