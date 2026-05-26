// src/routes/salones.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import { validate, schemaAulasDisponibles } from '../middleware/validators.js';
import * as svc from '../services/salones.service.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  const data = await svc.getAllSalones(req.query);
  res.json({ ok: true, data, count: data.length });
}));

router.get('/disponibles', validate(schemaAulasDisponibles, 'query'), wrap(async (req, res) => {
  const data = await svc.getAulasDisponibles(req.query);
  res.json({ ok: true, data, count: data.length });
}));

router.get('/ocupacion', wrap(async (req, res) => {
  const data = await svc.getOcupacionSalones();
  res.json({ ok: true, data });
}));

export default router;
