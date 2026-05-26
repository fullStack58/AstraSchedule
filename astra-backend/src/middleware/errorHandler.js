// src/middleware/errorHandler.js
// Manejo centralizado de errores — nunca expone stack en producción

import { ZodError } from 'zod';

/**
 * Convierte cualquier error en una respuesta JSON estructurada.
 * Formato estándar: { ok: false, error: { code, message, details? } }
 */
export function errorHandler(err, req, res, _next) {
  // Errores de validación Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.flatten().fieldErrors,
      },
    });
  }

  // Errores de PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    const pgMessages = {
      '23505': 'Registro duplicado — ya existe un elemento con esos datos',
      '23503': 'Referencia inválida — el recurso relacionado no existe',
      '23514': 'Restricción de negocio violada — revisa las reglas del sistema',
    };
    return res.status(409).json({
      ok: false,
      error: {
        code: 'DB_CONSTRAINT',
        message: pgMessages[err.code] || 'Conflicto de base de datos',
        detail: err.detail || null,
      },
    });
  }

  // Errores de negocio lanzados manualmente (throw new Error('...'))
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code || 'BUSINESS_ERROR', message: err.message },
    });
  }

  // Error genérico
  const isProd = process.env.NODE_ENV === 'production';
  console.error('❌ Error no controlado:', err);
  return res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Error interno del servidor' : err.message,
    },
  });
}

/** Helper para crear errores de negocio con código HTTP */
export function createError(message, statusCode = 400, code = 'ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
