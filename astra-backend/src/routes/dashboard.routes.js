// src/routes/dashboard.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import * as svc from '../services/dashboard.service.js';

const router = Router();

// GET /api/dashboard — stats globales del semestre activo
router.get('/', wrap(async (req, res) => {
  const [stats, porPrograma, porJornadaSede] = await Promise.all([
    svc.getDashboardStats(),
    svc.getEstadoPorPrograma(),
    svc.getEstadoPorJornadaSede(),
  ]);
  res.json({ ok: true, data: { stats, por_programa: porPrograma, por_jornada_sede: porJornadaSede } });
}));

// GET /api/dashboard/semana?sede_codigo=NORTE&jornada_codigo=Diurna
router.get('/semana', wrap(async (req, res) => {
  const data = await svc.getSemanaSede(req.query);
  res.json({ ok: true, data });
}));

export default router;
