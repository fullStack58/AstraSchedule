// src/middleware/asyncWrapper.js
// Elimina los try/catch repetitivos en cada controller

/**
 * Envuelve un handler async y redirige cualquier error al errorHandler central.
 * Uso: router.get('/ruta', wrap(miControllerAsync))
 */
export const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
