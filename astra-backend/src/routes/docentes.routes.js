// src/routes/docentes.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import { validate, schemaDocentesDisponibles } from '../middleware/validators.js';
import * as svc from '../services/docentes.service.js';

const router = Router();

// GET /api/docentes?tipo=TC&disponibilidad=Diurna
router.get('/', wrap(async (req, res) => {
  const data = await svc.getAllDocentes(req.query);
  res.json({ ok: true, data, count: data.length });
}));

// GET /api/docentes/sobrecarga
router.get('/sobrecarga', wrap(async (req, res) => {
  const data = await svc.getDocentesConSobrecarga();
  res.json({ ok: true, data, count: data.length });
}));

// GET /api/docentes/disponibles?dia=Lunes&hora_inicio=07:00&hora_fin=10:00
router.get('/disponibles', validate(schemaDocentesDisponibles, 'query'), wrap(async (req, res) => {
  const data = await svc.getDocentesDisponibles(req.query);
  res.json({ ok: true, data, count: data.length });
}));

// GET /api/docentes/:id
router.get('/:id', wrap(async (req, res) => {
  const data = await svc.getDocenteById(Number(req.params.id));
  if (!data) return res.status(404).json({ ok: false, error: { message: 'Docente no encontrado' } });
  res.json({ ok: true, data });
}));

// GET /api/docentes/:id/carga
router.get('/:id/carga', wrap(async (req, res) => {
  const data = await svc.getCargaDocente(Number(req.params.id));
  if (!data) return res.status(404).json({ ok: false, error: { message: 'Docente no encontrado' } });
  res.json({ ok: true, data });
}));

// GET /api/docentes/:id/disponibilidad
router.get('/:id/disponibilidad', wrap(async (req, res) => {
  const data = await svc.getDisponibilidadDocente(Number(req.params.id));
  res.json({ ok: true, data });
}));

export default router;
