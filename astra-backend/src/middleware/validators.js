// src/middleware/validators.js
// Esquemas Zod alineados al schema PostgreSQL del proyecto

import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────────────────
const horaHHMM = z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido');
const diasSemana = z.enum(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']);
const jornadas   = z.enum(['Diurna', 'Nocturna']);
const modalidades = z.enum(['presencial', 'virtual']);
const estadosHorario = z.enum(['propuesto', 'confirmado', 'conflicto', 'cancelado']);

// ── Horarios ─────────────────────────────────────────────────────────────────
export const schemaResumenEstado = z.object({
  programa_id: z.string().min(1).toUpperCase(),
  jornada:     jornadas,
  modalidad:   modalidades,
  sede:        z.string().optional(),
});

export const schemaListarGruposSinHorario = z.object({
  programa_id: z.string().min(1).toUpperCase(),
  jornada:     jornadas,
  semestre:    z.coerce.number().int().min(1).max(12).optional(),
  sede:        z.string().optional(),
});

export const schemaAsignarClase = z.object({
  grupo_id:      z.coerce.number().int().positive(),
  docente_id:    z.coerce.number().int().positive(),
  aula_id:       z.coerce.number().int().positive(),
  dia:           diasSemana,
  hora_inicio:   horaHHMM,
  hora_fin:      horaHHMM,
  es_definitiva: z.coerce.boolean().optional().default(false),
});

export const schemaCambiarEstado = z.object({
  nuevo_estado: estadosHorario,
  motivo:       z.string().max(500).optional(),
});

export const schemaContrapropuesta = z.object({
  nueva_franja_sugerida: z.object({
    dia:         diasSemana,
    hora_inicio: horaHHMM,
    hora_fin:    horaHHMM,
  }),
});

// ── Docentes ─────────────────────────────────────────────────────────────────
export const schemaDocentesDisponibles = z.object({
  dia:         diasSemana,
  hora_inicio: horaHHMM,
  hora_fin:    horaHHMM,
  materia_id:  z.coerce.number().int().positive().optional(),
});

// ── Aulas ─────────────────────────────────────────────────────────────────────
export const schemaAulasDisponibles = z.object({
  dia:               diasSemana,
  hora_inicio:       horaHHMM,
  hora_fin:          horaHHMM,
  capacidad_minima:  z.coerce.number().int().positive().optional().default(1),
  tipo_aula:         z.enum(['presencial', 'laboratorio', 'virtual', 'cualquiera']).optional(),
});

// ── Grupos ────────────────────────────────────────────────────────────────────
export const schemaProponerHorario = z.object({
  grupo_id:     z.coerce.number().int().positive(),
  restricciones: z.object({
    sede_id:    z.coerce.number().int().optional(),
    docente_id: z.coerce.number().int().optional(),
  }).optional().default({}),
});

// ── AI Chat ───────────────────────────────────────────────────────────────────
export const schemaChatMessage = z.object({
  message:  z.string().min(1).max(2000),
  history:  z.array(z.object({
    role:    z.enum(['user', 'assistant', 'tool']),
    content: z.string(),
  })).optional().default([]),
  stream:   z.coerce.boolean().optional().default(false),
});

// ── Middleware factory ────────────────────────────────────────────────────────
/**
 * Valida req.body (o req.query para GETs) con un esquema Zod.
 * Si falla, lanza error que captura errorHandler.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const err = Object.assign(new Error('Validación fallida'), {
        statusCode: 400,
        errors: result.error.flatten().fieldErrors,
      });
      // Adjuntamos el ZodError para que errorHandler lo reconozca
      return next(result.error);
    }
    req[source] = result.data; // datos limpios y tipados
    next();
  };
}
