// src/routes/conflictos.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import * as svc from '../services/conflictos.service.js';

// Importaciones de los nuevos controladores del Módulo 6
import {
  detectarCarga,
  detectarPrerequisitosController,
  listarAuditoria
} from '../controllers/conflictos.controller.js';

const router = Router();

// ==========================================
// RUTAS ORIGINALES DEL PROYECTO
// ==========================================

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

// ==========================================
// NUEVAS RUTAS INTEGRADAS (MÓDULO 6)
// ==========================================

// GET /api/conflictos/carga-excedida
router.get('/carga-excedida', detectarCarga);

// GET /api/conflictos/prerequisitos
router.get('/prerequisitos', detectarPrerequisitosController);

// GET /api/conflictos/auditoria
router.get('/auditoria', listarAuditoria);

export default router;