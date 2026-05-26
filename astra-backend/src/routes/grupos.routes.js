// src/routes/grupos.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import { getAllGrupos, getGrupoById, getAllMaterias } from '../services/grupos.service.js';

const gruposRouter = Router();

gruposRouter.get('/', wrap(async (req, res) => {
  const data = await getAllGrupos(req.query);
  res.json({ ok: true, data, count: data.length });
}));

gruposRouter.get('/:id', wrap(async (req, res) => {
  const data = await getGrupoById(Number(req.params.id));
  if (!data) return res.status(404).json({ ok: false, error: { message: 'Grupo no encontrado' } });
  res.json({ ok: true, data });
}));

export { gruposRouter };

// ─────────────────────────────────────────────────────────────────────────────

// src/routes/materias.routes.js (inline)
const materiasRouter = Router();

materiasRouter.get('/', wrap(async (req, res) => {
  const data = await getAllMaterias(req.query);
  res.json({ ok: true, data, count: data.length });
}));

export { materiasRouter };
