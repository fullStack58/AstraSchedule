// src/routes/horarios.routes.js
// imp...
import { Router } from "express";
import { wrap } from "../middleware/asyncWrapper.js";
import { validate } from "../middleware/validators.js";
import {
	schemaResumenEstado,
	schemaListarGruposSinHorario,
	schemaAsignarClase,
	schemaCambiarEstado,
	schemaContrapropuesta,
} from "../middleware/validators.js";
import * as svc from "../services/horarios.service.js";

const router = Router();

// GET /api/horarios?estado=confirmado&programa_id=IS&jornada=Diurna&sede=NORTE
router.get(
	"/",
	wrap(async (req, res) => {
		const data = await svc.getAllHorarios(req.query);
		res.json({ ok: true, data, count: data.length });
	}),
);

// GET /api/horarios/resumen?programa_id=IS&jornada=Diurna&modalidad=presencial&sede=NORTE
router.get(
	"/resumen",
	validate(schemaResumenEstado, "query"),
	wrap(async (req, res) => {
		const data = await svc.getResumenEstado(req.query);
		res.json({ ok: true, data });
	}),
);

// GET /api/horarios/sin-horario?programa_id=IS&jornada=Diurna
router.get(
	"/sin-horario",
	validate(schemaListarGruposSinHorario, "query"),
	wrap(async (req, res) => {
		const data = await svc.getGruposSinHorario(req.query);
		res.json({ ok: true, data, count: data.length });
	}),
);

// POST /api/horarios/proponer
router.post(
	"/proponer",
	wrap(async (req, res) => {
		const data = await svc.proponerHorario(req.body);
		res.status(201).json({ ok: true, data });
	}),
);

// POST /api/horarios/asignar
router.post(
	"/asignar",
	validate(schemaAsignarClase),
	wrap(async (req, res) => {
		const data = await svc.asignarClase(req.body);
		res.status(201).json({
			ok: true,
			data,
			message: "Asignación registrada exitosamente",
		});
	}),
);

// GET /api/horarios/:id
router.get(
	"/:id",
	wrap(async (req, res) => {
		const data = await svc.getHorarioById(Number(req.params.id));
		if (!data)
			return res
				.status(404)
				.json({
					ok: false,
					error: { message: "Horario no encontrado" },
				});
		res.json({ ok: true, data });
	}),
);

// PATCH /api/horarios/:id/estado
router.patch(
	"/:id/estado",
	validate(schemaCambiarEstado),
	wrap(async (req, res) => {
		const data = await svc.cambiarEstadoHorario(
			Number(req.params.id),
			req.body.nuevo_estado,
			req.body.motivo,
		);
		res.json({ ok: true, data });
	}),
);

// POST /api/horarios/:id/contrapropuesta
router.post(
	"/:id/contrapropuesta",
	validate(schemaContrapropuesta),
	wrap(async (req, res) => {
		const data = await svc.procesarContrapropuesta(
			Number(req.params.id),
			req.body.nueva_franja_sugerida,
		);
		res.json({ ok: true, data });
	}),
);

// GET /api/horarios/reporte/:grupo_id
router.get(
	"/reporte/:grupo_id",
	wrap(async (req, res) => {
		const data = await svc.getReporteHorario(Number(req.params.grupo_id));
		res.json({ ok: true, data });
	}),
);

export default router;
