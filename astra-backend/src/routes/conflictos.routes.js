// src/routes/conflictos.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import * as svc from '../services/conflictos.service.js';

const router = Router();

// GET /api/conflictos?resuelto=false&tipo=aula_solapada
router.get('/', wrap(async (req, res) => {
  const resuelto = req.query.resuelto !== undefined
    ? req.query.resuelto === 'true'
    : null;
  const data = await svc.getAllConflictos({ ...req.query, resuelto });
  res.json({ ok: true, data, count: data.length });
}));

// GET /api/conflictos/resumen
router.get('/resumen', wrap(async (req, res) => {
  const data = await svc.getResumenConflictos();
  res.json({ ok: true, data });
}));

// GET /api/conflictos/detectar — ejecuta detección activa
router.get('/detectar', wrap(async (req, res) => {
  const data = await svc.detectarConflictosActivos();
  res.json({ ok: true, data, count: data.length });
}));

// PATCH /api/conflictos/:id/resolver
router.patch('/:id/resolver', wrap(async (req, res) => {
  const data = await svc.resolverConflicto(Number(req.params.id));
  res.json({ ok: true, data, message: 'Conflicto marcado como resuelto' });
}));

export default router;
