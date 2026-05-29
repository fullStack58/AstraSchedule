/**
 * SchedulingService — Encapsulación de lógica del motor de asignación
 */

import { generarHorarios, planificarGrupo } from "../tools/schedule-engine/engine.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("SchedulingService");

class SchedulingService {
	/**
	 * Genera horarios completos para una lista de grupos
	 * @param {Object} input - Contiene: grupos, docentes, salones, franjas, reglas
	 * @returns {Promise<Object>} Resultado con asignaciones
	 */
	static async generarHorarios(input) {
		try {
			logger.info("Iniciando generación de horarios...");
			logger.debug(`Input recibido:`, {
				grupos_count: input?.grupos?.length,
				docentes_count: input?.docentes?.length,
				salones_count: input?.salones?.length,
				franjas_count: input?.franjas?.length,
			});

			const resultado = generarHorarios(input);

			const estadisticas = {
				total_grupos: resultado.grupos_ordenados?.length ?? 0,
				confirmados: resultado.asignaciones?.filter(
					(a) => a.status === "confirmado",
				).length ?? 0,
				conflictos: resultado.asignaciones?.filter(
					(a) => a.status === "conflicto",
				).length ?? 0,
				tasa_exito: (
					(resultado.asignaciones?.filter((a) => a.status === "confirmado")
						.length ?? 0) / (resultado.grupos_ordenados?.length ?? 1)
				).toFixed(2),
			};

			logger.info(`Generación completada:`, estadisticas);

			return {
				success: true,
				data: {
					...resultado,
					estadisticas,
				},
				message: `Horarios generados: ${estadisticas.confirmados}/${estadisticas.total_grupos} grupos asignados`,
			};
		} catch (error) {
			logger.error(`Error en generarHorarios: ${error.message}`, {
				stack: error.stack,
			});
			return {
				success: false,
				error: error.message,
				details: error.stack,
			};
		}
	}

	/**
	 * Planifica horario para un grupo individual
	 * @param {Object} grupoData - Datos del grupo
	 * @param {Array} docentes - Lista de docentes disponibles
	 * @param {Array} salones - Lista de salones disponibles
	 * @param {Array} franjas - Lista de franjas horarias
	 * @param {Object} reglas - Reglas de asignación
	 * @returns {Promise<Object>} Propuesta de asignación
	 */
	static async planificarGrupoIndividual(
		grupoData,
		docentes,
		salones,
		franjas,
		reglas = {},
	) {
		try {
			logger.info(
				`Planificando grupo: ${grupoData?.nombre || grupoData?.id}`,
			);

			const resultado = planificarGrupo({
				grupo: grupoData,
				docentes,
				salones,
				franjas,
				reglas,
			});

			if (resultado.candidato) {
				logger.info(
					`✓ Propuesta encontrada para ${grupoData.nombre}`,
				);
			} else {
				logger.warn(
					`✗ No se encontró propuesta para ${grupoData.nombre}`,
				);
			}

			return {
				success: true,
				data: resultado,
			};
		} catch (error) {
			logger.error(
				`Error en planificarGrupoIndividual: ${error.message}`,
				{ stack: error.stack },
			);
			return {
				success: false,
				error: error.message,
				details: error.stack,
			};
		}
	}

	/**
	 * Valida la integridad de datos de entrada
	 * @param {Object} input - Datos a validar
	 * @returns {Object} { valid: boolean, errors: Array<string> }
	 */
	static validarInput(input) {
		const errors = [];

		if (!Array.isArray(input?.grupos) || input.grupos.length === 0) {
			errors.push("Se requiere un array no vacío de grupos");
		}

		if (!Array.isArray(input?.docentes) || input.docentes.length === 0) {
			errors.push("Se requiere un array no vacío de docentes");
		}

		if (!Array.isArray(input?.salones) || input.salones.length === 0) {
			errors.push("Se requiere un array no vacío de salones");
		}

		if (!Array.isArray(input?.franjas) || input.franjas.length === 0) {
			errors.push("Se requiere un array no vacío de franjas horarias");
		}

		// Validar estructura mínima de grupos
		input?.grupos?.forEach((g, idx) => {
			if (!g.id) errors.push(`Grupo ${idx}: falta 'id'`);
			if (!g.nombre) errors.push(`Grupo ${idx}: falta 'nombre'`);
			if (!g.jornada) errors.push(`Grupo ${idx}: falta 'jornada'`);
			if (!g.cupo_estimado && !g.cupo_max)
				errors.push(`Grupo ${idx}: falta 'cupo_estimado' o 'cupo_max'`);
		});

		// Validar estructura mínima de docentes
		input?.docentes?.forEach((d, idx) => {
			if (!d.id) errors.push(`Docente ${idx}: falta 'id'`);
			if (!d.nombre) errors.push(`Docente ${idx}: falta 'nombre'`);
			if (!d.carga_max_horas)
				errors.push(`Docente ${idx}: falta 'carga_max_horas'`);
		});

		// Validar estructura mínima de salones
		input?.salones?.forEach((s, idx) => {
			if (!s.id) errors.push(`Salón ${idx}: falta 'id'`);
			if (!s.codigo) errors.push(`Salón ${idx}: falta 'codigo'`);
			if (!s.capacidad) errors.push(`Salón ${idx}: falta 'capacidad'`);
			if (!s.tipo) errors.push(`Salón ${idx}: falta 'tipo'`);
		});

		// Validar estructura mínima de franjas
		input?.franjas?.forEach((f, idx) => {
			if (!f.id) errors.push(`Franja ${idx}: falta 'id'`);
			if (!f.jornada) errors.push(`Franja ${idx}: falta 'jornada'`);
			if (!f.hora_inicio)
				errors.push(`Franja ${idx}: falta 'hora_inicio'`);
			if (!f.hora_fin) errors.push(`Franja ${idx}: falta 'hora_fin'`);
		});

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}

export default SchedulingService;
