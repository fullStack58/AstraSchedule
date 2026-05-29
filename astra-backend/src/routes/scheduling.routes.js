/**
 * scheduling.routes.js — Rutas para el motor de asignación
 */

import express from "express";
import SchedulingService from "../services/schedulingService.js";
import DataService from "../services/dataService.js";
import { Logger } from "../utils/logger.js";

const router = express.Router();
const logger = new Logger("SchedulingRoutes");

/**
 * POST /api/scheduling/generate
 * Genera horarios completos
 *
 * Body esperado:
 * {
 *   grupos: Array<Object>,
 *   docentes: Array<Object>,
 *   salones: Array<Object>,
 *   franjas: Array<Object>,
 *   reglas?: Object
 * }
 */
router.post("/generate", async (req, res, next) => {
	try {
		logger.info("POST /generate - Solicitud recibida");

		const { grupos, docentes, salones, franjas, reglas } = req.body;

		// Validar input
		const validacion = SchedulingService.validarInput({
			grupos,
			docentes,
			salones,
			franjas,
		});

		if (!validacion.valid) {
			logger.warn("Validación fallida", { errores: validacion.errors });
			return res.status(400).json({
				ok: false,
				error: "Datos de entrada inválidos",
				details: validacion.errors,
			});
		}

		logger.info("Input válido, procesando...");

		const resultado = await SchedulingService.generarHorarios({
			grupos,
			docentes,
			salones,
			franjas,
			reglas,
		});

		if (!resultado.success) {
			logger.error("Error en generación", { error: resultado.error });
			return res.status(500).json({
				ok: false,
				error: resultado.error,
				details: resultado.details,
			});
		}

		logger.info("Horarios generados exitosamente");
		res.json({
			ok: true,
			message: resultado.message,
			data: resultado.data,
		});
	} catch (err) {
		logger.error(`Error inesperado: ${err.message}`, { stack: err.stack });
		next(err);
	}
});

/**
 * POST /api/scheduling/group
 * Planifica horario para un grupo individual
 *
 * Body esperado:
 * {
 *   grupo: Object,
 *   docentes: Array<Object>,
 *   salones: Array<Object>,
 *   franjas: Array<Object>,
 *   reglas?: Object
 * }
 */
router.post("/group", async (req, res, next) => {
	try {
		logger.info("POST /group - Solicitud recibida");

		const { grupo, docentes, salones, franjas, reglas } = req.body;

		// Validación básica
		if (!grupo || !Array.isArray(docentes) || !Array.isArray(salones) || !Array.isArray(franjas)) {
			logger.warn("Validación fallida - datos incompletos");
			return res.status(400).json({
				ok: false,
				error: "Datos incompletos. Se requiere: grupo, docentes, salones, franjas",
			});
		}

		const resultado = await SchedulingService.planificarGrupoIndividual(
			grupo,
			docentes,
			salones,
			franjas,
			reglas,
		);

		if (!resultado.success) {
			logger.error("Error en planificación", { error: resultado.error });
			return res.status(500).json({
				ok: false,
				error: resultado.error,
				details: resultado.details,
			});
		}

		logger.info("Planificación completada");
		res.json({
			ok: true,
			data: resultado.data,
		});
	} catch (err) {
		logger.error(`Error inesperado: ${err.message}`, { stack: err.stack });
		next(err);
	}
});

/**
 * POST /api/scheduling/validate
 * Valida datos de entrada sin ejecutar el motor
 *
 * Body esperado: mismo que /generate
 */
router.post("/validate", (req, res) => {
	try {
		logger.info("POST /validate - Solicitud recibida");

		const { grupos, docentes, salones, franjas } = req.body;

		const validacion = SchedulingService.validarInput({
			grupos,
			docentes,
			salones,
			franjas,
		});

		logger.info(`Validación completada: ${validacion.valid ? "OK" : "FALLOS"}`);

		res.json({
			ok: true,
			valid: validacion.valid,
			errors: validacion.errors,
		});
	} catch (err) {
		logger.error(`Error inesperado: ${err.message}`);
		res.status(500).json({
			ok: false,
			error: err.message,
		});
	}
});

/**
 * GET /api/scheduling/generate-db
 * Genera horarios usando datos desde la BD
 *
 * Query params:
 * - periodoId (opcional): ID del período. Si no se proporciona, usa el activo
 * - estrategia (opcional): 'greedy' o 'backtracking_simple' (default)
 * - guardar (opcional): 'true' para guardar asignaciones en BD
 */
router.get("/generate-db", async (req, res, next) => {
	try {
		logger.info("GET /generate-db - Solicitud recibida");

		let { periodoId, estrategia = "backtracking_simple", guardar = "false" } = req.query;

		// Si no hay periodoId, obtener el activo
		if (!periodoId) {
			const periodo = await DataService.obtenerPeriodoActivo();
			if (!periodo) {
				logger.warn("No hay período académico activo");
				return res.status(400).json({
					ok: false,
					error: "No hay período académico activo. Proporciona periodoId.",
				});
			}
			periodoId = periodo.id;
			logger.info(`Usando período activo: ${periodo.codigo}`);
		} else {
			periodoId = parseInt(periodoId);
		}

		// Obtener datos desde BD
		logger.info("Obteniendo datos desde la BD...");
		const datos = await DataService.obtenerDatosCompletos(periodoId);

		if (datos.grupos.length === 0) {
			logger.warn("No hay grupos para el período especificado");
			return res.status(400).json({
				ok: false,
				error: "No hay grupos inscritos para este período",
			});
		}

		// Generar horarios
		logger.info(`Generando horarios con estrategia: ${estrategia}`);
		const resultado = await SchedulingService.generarHorarios({
			grupos: datos.grupos,
			docentes: datos.docentes,
			salones: datos.salones,
			franjas: datos.franjas,
			reglas: { estrategia },
		});

		if (!resultado.success) {
			logger.error("Error en generación", { error: resultado.error });
			return res.status(500).json({
				ok: false,
				error: resultado.error,
				details: resultado.details,
			});
		}

		// Guardar en BD si se solicita
		let guardado = null;
		if (guardar === "true") {
			logger.info("Guardando asignaciones en la BD...");
			guardado = await DataService.guardarAsignacionesLote(
				resultado.data.asignaciones,
				periodoId,
			);
			logger.info(`Asignaciones guardadas: ${guardado.guardadas}/${guardado.total}`);
		}

		logger.info("Generación completada exitosamente");
		res.json({
			ok: true,
			message: resultado.message,
			data: {
				...resultado.data,
				guardado,
			},
		});
	} catch (err) {
		logger.error(`Error inesperado: ${err.message}`, { stack: err.stack });
		next(err);
	}
});

/**
 * GET /api/scheduling/datos-bd/:periodoId
 * Obtiene datos del período para debugging/visualización
 *
 * Path params:
 * - periodoId: ID del período
 */
router.get("/datos-bd/:periodoId", async (req, res, next) => {
	try {
		const periodoId = parseInt(req.params.periodoId);

		logger.info(`GET /datos-bd/:${periodoId} - Obteniendo datos...`);

		const datos = await DataService.obtenerDatosCompletos(periodoId);

		res.json({
			ok: true,
			data: {
				resumen: {
					grupos: datos.grupos.length,
					docentes: datos.docentes.length,
					salones: datos.salones.length,
					franjas: datos.franjas.length,
				},
				grupos: datos.grupos,
				docentes: datos.docentes,
				salones: datos.salones,
				franjas: datos.franjas,
			},
		});
	} catch (err) {
		logger.error(`Error: ${err.message}`, { stack: err.stack });
		res.status(500).json({
			ok: false,
			error: err.message,
		});
	}
});

/**
 * GET /api/scheduling/periodo-activo
 * Obtiene el período académico activo actual
 */
router.get("/periodo-activo", async (req, res, next) => {
	try {
		logger.info("GET /periodo-activo - Buscando período activo...");

		const periodo = await DataService.obtenerPeriodoActivo();

		if (!periodo) {
			return res.status(404).json({
				ok: false,
				error: "No hay período académico activo",
			});
		}

		res.json({
			ok: true,
			data: periodo,
		});
	} catch (err) {
		logger.error(`Error: ${err.message}`);
		res.status(500).json({
			ok: false,
			error: err.message,
		});
	}
});

export default router;
