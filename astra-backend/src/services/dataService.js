/**
 * dataService.js — Servicio para obtener datos de la BD
 *
 * Extrae grupos, docentes, salones y franjas de PostgreSQL
 * para alimentar el motor de asignación.
 */

import { pool } from "../config/db.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("DataService");

class DataService {
	/**
	 * Obtiene todos los grupos activos de un período
	 * @param {number} periodoId - ID del periodo académico
	 * @returns {Promise<Array>} Array de grupos formateados
	 */
	static async obtenerGrupos(periodoId) {
		try {
			logger.info(`Obteniendo grupos del periodo ${periodoId}...`);

			const query = `
				SELECT
					g.id,
					g.numero,
					m.codigo AS materia_codigo,
					m.nombre AS nombre,
					j.nombre AS jornada,
					g.modalidad,
					s.codigo AS sede_codigo,
					g.cupo_max,
					m.horas_semana,
					m.tipo_aula_requerida,
					COALESCE(
						(SELECT COUNT(*) FROM inscripciones 
						 WHERE grupo_id = g.id AND estado IN ('activa', 'aprobada')),
						0
					) AS cupo_estimado,
					g.requiere_autorizacion AS prioridad
				FROM grupos g
				JOIN materias m ON g.materia_id = m.id
				JOIN jornadas j ON g.jornada_id = j.id
				LEFT JOIN sedes s ON g.sede_id = s.id
				WHERE g.periodo_id = $1 
				  AND g.estado != 'cancelado'
				ORDER BY m.codigo, g.numero
			`;

			const result = await pool.query(query, [periodoId]);
			logger.debug(`Se encontraron ${result.rows.length} grupos`);

			return result.rows.map((row) => ({
				id: row.id,
				nombre: `${row.materia_codigo} - Grupo ${row.numero}`,
				materia_codigo: row.materia_codigo,
				jornada: row.jornada,
				modalidad: row.modalidad,
				sede_codigo: row.sede_codigo || "VIRTUAL",
				cupo_max: row.cupo_max,
				cupo_estimado: Math.min(
					parseInt(row.cupo_estimado) || 0,
					row.cupo_max,
				),
				tipo_aula_requerida: row.tipo_aula_requerida,
				prioridad: row.requiere_autorizacion ? 10 : 5,
			}));
		} catch (error) {
			logger.error(`Error obteniendo grupos: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Obtiene todos los docentes activos
	 * @returns {Promise<Array>} Array de docentes formateados
	 */
	static async obtenerDocentes() {
		try {
			logger.info("Obteniendo docentes activos...");

			const query = `
				SELECT
					d.id,
					d.nombre,
					d.disponibilidad,
					d.carga_max_horas,
					COALESCE(
						(SELECT SUM(
							EXTRACT(EPOCH FROM (bh.hora_fin - bh.hora_inicio)) / 3600
						)
						FROM horario_asignado ha
						JOIN franjas_horarias fh ON ha.franja_id = fh.id
						JOIN bloques_horarios bh ON fh.bloque_id = bh.id
						WHERE ha.docente_id = d.id 
						  AND ha.estado IN ('confirmado', 'propuesto')
						),
						0
					) AS horas_asignadas
				FROM docentes d
				WHERE d.activo = TRUE
				ORDER BY d.nombre
			`;

			const result = await pool.query(query);
			logger.debug(`Se encontraron ${result.rows.length} docentes`);

			return result.rows.map((row) => ({
				id: row.id,
				nombre: row.nombre,
				disponibilidad: row.disponibilidad,
				carga_max_horas: row.carga_max_horas,
				horas_asignadas: Math.round(row.horas_asignadas || 0),
			}));
		} catch (error) {
			logger.error(`Error obteniendo docentes: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Obtiene todos los salones disponibles
	 * @returns {Promise<Array>} Array de salones formateados
	 */
	static async obtenerSalones() {
		try {
			logger.info("Obteniendo salones disponibles...");

			const query = `
				SELECT
					s.id,
					s.codigo,
					s.tipo,
					s.capacidad,
					sd.codigo AS sede_codigo
				FROM salones s
				JOIN sedes sd ON s.sede_id = sd.id
				WHERE s.disponible = TRUE
				ORDER BY sd.codigo, s.codigo
			`;

			const result = await pool.query(query);
			logger.debug(`Se encontraron ${result.rows.length} salones`);

			return result.rows.map((row) => ({
				id: row.id,
				codigo: row.codigo,
				tipo: row.tipo,
				capacidad: row.capacidad,
				sede_codigo: row.sede_codigo,
			}));
		} catch (error) {
			logger.error(`Error obteniendo salones: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Obtiene todas las franjas horarias de un período
	 * @param {number} periodoId - ID del periodo académico
	 * @returns {Promise<Array>} Array de franjas formateadas
	 */
	static async obtenerFranjas(periodoId) {
		try {
			logger.info(`Obteniendo franjas del periodo ${periodoId}...`);

			const query = `
				SELECT
					fh.id,
					fh.dia,
					j.nombre AS jornada,
					bh.hora_inicio,
					bh.hora_fin
				FROM franjas_horarias fh
				JOIN bloques_horarios bh ON fh.bloque_id = bh.id
				JOIN jornadas j ON bh.jornada_id = j.id
				WHERE fh.periodo_id = $1
				ORDER BY j.id, 
					CASE fh.dia
						WHEN 'Lunes' THEN 1
						WHEN 'Martes' THEN 2
						WHEN 'Miercoles' THEN 3
						WHEN 'Jueves' THEN 4
						WHEN 'Viernes' THEN 5
						WHEN 'Sabado' THEN 6
						WHEN 'Domingo' THEN 7
					END,
					bh.orden
			`;

			const result = await pool.query(query, [periodoId]);
			logger.debug(`Se encontraron ${result.rows.length} franjas`);

			return result.rows.map((row) => ({
				id: row.id,
				dia: row.dia,
				jornada: row.jornada,
				hora_inicio: row.hora_inicio.substring(0, 5), // HH:MM
				hora_fin: row.hora_fin.substring(0, 5), // HH:MM
			}));
		} catch (error) {
			logger.error(`Error obteniendo franjas: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Obtiene todos los datos necesarios para generar horarios
	 * @param {number} periodoId - ID del periodo académico
	 * @returns {Promise<Object>} Objeto con {grupos, docentes, salones, franjas}
	 */
	static async obtenerDatosCompletos(periodoId) {
		try {
			logger.info(
				`Obteniendo datos completos para periodo ${periodoId}...`,
			);

			const [grupos, docentes, salones, franjas] = await Promise.all([
				this.obtenerGrupos(periodoId),
				this.obtenerDocentes(),
				this.obtenerSalones(),
				this.obtenerFranjas(periodoId),
			]);

			logger.info(
				`Datos completos obtenidos: ${grupos.length} grupos, ${docentes.length} docentes, ${salones.length} salones, ${franjas.length} franjas`,
			);

			return {
				grupos,
				docentes,
				salones,
				franjas,
			};
		} catch (error) {
			logger.error(
				`Error obteniendo datos completos: ${error.message}`,
				{ stack: error.stack },
			);
			throw error;
		}
	}

	/**
	 * Obtiene el periodo activo actual
	 * @returns {Promise<Object>} Objeto del periodo o null
	 */
	static async obtenerPeriodoActivo() {
		try {
			logger.info("Buscando periodo académico activo...");

			const query = `
				SELECT id, codigo, nombre
				FROM periodos_academicos
				WHERE activo = TRUE
				LIMIT 1
			`;

			const result = await pool.query(query);

			if (result.rows.length === 0) {
				logger.warn("No hay periodo académico activo");
				return null;
			}

			const periodo = result.rows[0];
			logger.info(`Periodo activo: ${periodo.codigo} - ${periodo.nombre}`);
			return periodo;
		} catch (error) {
			logger.error(
				`Error obteniendo periodo activo: ${error.message}`,
				{ stack: error.stack },
			);
			throw error;
		}
	}

	/**
	 * Guarda una asignación propuesta en la BD
	 * @param {Object} candidato - Candidato con grupo, docente, salon, franja
	 * @param {string} estado - Estado de la asignación (propuesto/confirmado/conflicto)
	 * @returns {Promise<Object>} Objeto de asignación guardada
	 */
	static async guardarAsignacion(candidato, estado = "propuesto") {
		try {
			logger.info(
				`Guardando asignación: Grupo ${candidato.grupo.id}, Docente ${candidato.docente.id}, Salón ${candidato.salon.id}, Franja ${candidato.franja.id}`,
			);

			const query = `
				INSERT INTO horario_asignado 
				(grupo_id, docente_id, salon_id, franja_id, estado)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id, creado_en
			`;

			const result = await pool.query(query, [
				candidato.grupo.id,
				candidato.docente.id,
				candidato.salon.id,
				candidato.franja.id,
				estado,
			]);

			logger.info(`Asignación guardada con ID ${result.rows[0].id}`);
			return result.rows[0];
		} catch (error) {
			logger.error(`Error guardando asignación: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Guarda múltiples asignaciones (resultado del motor)
	 * @param {Array} asignaciones - Array con resultado del motor
	 * @param {number} periodoId - ID del periodo
	 * @returns {Promise<Object>} Estadísticas de guardado
	 */
	static async guardarAsignacionesLote(asignaciones, periodoId) {
		try {
			logger.info(
				`Guardando lote de ${asignaciones.length} asignaciones...`,
			);

			let confirmadas = 0;
			let errores = 0;

			for (const asignacion of asignaciones) {
				if (asignacion.status === "confirmado") {
					try {
						await this.guardarAsignacion(
							asignacion.candidato,
							"propuesto",
						);
						confirmadas++;
					} catch (err) {
						logger.warn(
							`Error guardando asignación de grupo ${asignacion.grupo.id}: ${err.message}`,
						);
						errores++;
					}
				}
			}

			logger.info(
				`Lote guardado: ${confirmadas} exitosas, ${errores} errores`,
			);

			return {
				total: asignaciones.length,
				guardadas: confirmadas,
				errores,
				periodoId,
			};
		} catch (error) {
			logger.error(`Error guardando lote: ${error.message}`, {
				stack: error.stack,
			});
			throw error;
		}
	}

	/**
	 * Obtiene disponibilidad de docentes en una franja
	 * @param {number} docenteId - ID del docente
	 * @param {number} franjaId - ID de la franja
	 * @returns {Promise<boolean>} true si está disponible
	 */
	static async esDocenteDisponibleEnFranja(docenteId, franjaId) {
		try {
			const query = `
				SELECT 1
				FROM disponibilidad_docente
				WHERE docente_id = $1 AND franja_id = $2
			`;

			const result = await pool.query(query, [docenteId, franjaId]);
			return result.rows.length > 0;
		} catch (error) {
			logger.error(
				`Error verificando disponibilidad: ${error.message}`,
			);
			return false;
		}
	}
}

export default DataService;
