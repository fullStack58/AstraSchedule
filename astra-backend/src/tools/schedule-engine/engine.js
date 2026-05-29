/**
 * Motor de asignación — Módulo adaptado para AstraSchedule
 *
 * Núcleo aislado y determinista para proponer horarios.
 * Cumple con:
 * - estrategia greedy
 * - backtracking simple
 * - ordenamiento de grupos
 * - priorización de restricciones
 */

import { Logger } from "../../utils/logger.js";

const logger = new Logger("ScheduleEngine");

const DEFAULT_RULES = {
	capacidad_tolerancia: 1,
	peso_ajuste_capacidad: 30,
	peso_carga_docente: 25,
	peso_sede: 15,
	peso_jornada: 10,
	peso_conflictos: 20,
	estrategia: "backtracking_simple",
	max_profundidad_backtracking: 50,
};

function normalizarTexto(valor) {
	return String(valor ?? "")
		.trim()
		.toLowerCase();
}

function horasBloque(franja) {
	const inicio = new Date(`1970-01-01T${franja.hora_inicio}:00`);
	const fin = new Date(`1970-01-01T${franja.hora_fin}:00`);
	return (fin - inicio) / 36e5;
}

function coincideJornada(entidadJornada, franjaJornada) {
	return normalizarTexto(entidadJornada) === normalizarTexto(franjaJornada);
}

function docenteDisponibleEnFranja(docente, franja) {
	if (!docente?.disponibilidad || docente.disponibilidad === "Ambas")
		return true;
	return coincideJornada(docente.disponibilidad, franja.jornada);
}

function esAulaCompatible(grupo, salon) {
	const requerida = normalizarTexto(
		grupo.tipo_aula_requerida || "cualquiera",
	);
	const tipoSalon = normalizarTexto(salon.tipo);
	return requerida === "cualquiera" || requerida === tipoSalon;
}

function salonTieneCupo(grupo, salon, reglas = {}) {
	const tolerancia = Number(
		reglas.capacidad_tolerancia ?? DEFAULT_RULES.capacidad_tolerancia,
	);
	const limite = Math.floor(Number(salon.capacidad ?? 0) * tolerancia);
	return Number(grupo.cupo_estimado ?? grupo.cupo_max ?? 0) <= limite;
}

function generarRazonesIncumplidas(
	grupo,
	docente,
	salon,
	franja,
	reglas = {},
	estado = {},
) {
	const razones = [];

	if (!coincideJornada(grupo.jornada, franja.jornada))
		razones.push("jornada_grupo_incompatible");
	if (!docenteDisponibleEnFranja(docente, franja))
		razones.push("docente_no_disponible");
	if (
		!coincideJornada(docente.disponibilidad ?? "Ambas", franja.jornada) &&
		docente.disponibilidad !== "Ambas"
	) {
		razones.push("jornada_docente_incompatible");
	}
	if (
		Number(docente.horas_asignadas ?? 0) + horasBloque(franja) >
		Number(docente.carga_max_horas ?? 0)
	) {
		razones.push("carga_docente_excedida");
	}
	if (!esAulaCompatible(grupo, salon)) razones.push("aula_incompatible");
	if (!salonTieneCupo(grupo, salon, reglas))
		razones.push("capacidad_excedida");
	if (
		grupo.modalidad === "presencial" &&
		normalizarTexto(grupo.sede_codigo) !==
			normalizarTexto(salon.sede_codigo)
	) {
		razones.push("sede_incompatible");
	}

	const franjaId = String(franja.id);
	const salonId = String(salon.id);
	const docenteId = String(docente.id);
	const ocupadosSalon = estado.ocupadosSalones?.get(franjaId);
	const ocupadosDocente = estado.ocupadosDocentes?.get(franjaId);

	if (ocupadosSalon?.has(salonId)) razones.push("aula_solapada");
	if (ocupadosDocente?.has(docenteId)) razones.push("docente_solapado");

	return razones;
}

function filtrarRestricciones(candidatos) {
	return candidatos.filter((c) => c.razones_incumplidas.length === 0);
}

function evaluarCandidato(candidato, reglas = {}) {
	const config = { ...DEFAULT_RULES, ...reglas };
	const grupo = candidato.grupo;
	const docente = candidato.docente;
	const salon = candidato.salon;
	const franja = candidato.franja;

	const capacidadGrupo = Number(grupo.cupo_estimado ?? grupo.cupo_max ?? 0);
	const capacidadSalon = Number(salon.capacidad ?? 0);
	const ajusteCapacidad =
		capacidadSalon > 0 ? capacidadGrupo / capacidadSalon : 0;

	const cargaActual = Number(docente.horas_asignadas ?? 0);
	const cargaMaxima = Number(docente.carga_max_horas ?? 0);
	const cargaRestante = Math.max(
		cargaMaxima - cargaActual - horasBloque(franja),
		0,
	);
	const factorCarga = cargaMaxima > 0 ? 1 - cargaRestante / cargaMaxima : 0;

	let score = 0;
	score +=
		config.peso_ajuste_capacidad *
		Math.max(0, 1 - Math.abs(1 - ajusteCapacidad));
	score += config.peso_carga_docente * factorCarga;
	score +=
		config.peso_sede *
		(normalizarTexto(grupo.sede_codigo) ===
		normalizarTexto(salon.sede_codigo)
			? 1
			: 0);
	score +=
		config.peso_jornada *
		(coincideJornada(grupo.jornada, franja.jornada) ? 1 : 0);

	if (candidato.conflictos_previos?.length) {
		score -= config.peso_conflictos * candidato.conflictos_previos.length;
	}

	if (grupo.prioridad != null) {
		score += Number(grupo.prioridad) * 0.01;
	}

	return {
		...candidato,
		score: Number(score.toFixed(2)),
	};
}

function generarCandidatosGrupo(input, estado = {}) {
	const {
		grupo,
		docentes = [],
		salones = [],
		franjas = [],
		reglas = {},
	} = input;
	const candidatos = [];

	for (const franja of franjas) {
		if (!coincideJornada(grupo.jornada, franja.jornada)) continue;

		for (const docente of docentes) {
			for (const salon of salones) {
				const razones_incumplidas = generarRazonesIncumplidas(
					grupo,
					docente,
					salon,
					franja,
					reglas,
					estado,
				);
				candidatos.push({
					grupo,
					docente,
					salon,
					franja,
					razones_incumplidas,
				});
			}
		}
	}

	return candidatos;
}

function elegirMejorCandidato(candidatos, reglas = {}) {
	const viables = filtrarRestricciones(candidatos).map((c) =>
		evaluarCandidato(c, reglas),
	);
	viables.sort((a, b) => b.score - a.score);
	return viables[0] ?? null;
}

function contarOpcionesGrupo(grupo, recursos, reglas = {}) {
	const candidatos = generarCandidatosGrupo({ grupo, ...recursos, reglas });
	return filtrarRestricciones(candidatos).length;
}

function ordenarGrupos(grupos = [], recursos = {}, reglas = {}) {
	logger.debug(`Ordenando ${grupos.length} grupos según disponibilidad...`);

	return [...grupos].sort((a, b) => {
		const opcionesA = contarOpcionesGrupo(a, recursos, reglas);
		const opcionesB = contarOpcionesGrupo(b, recursos, reglas);

		if (opcionesA !== opcionesB) {
			logger.debug(
				`Grupo ${a.id} (${opcionesA} opciones) vs ${b.id} (${opcionesB} opciones)`,
			);
			return opcionesA - opcionesB;
		}

		const prioridad = Number(b.prioridad ?? 0) - Number(a.prioridad ?? 0);
		if (prioridad !== 0) return prioridad;

		const cupo =
			Number(b.cupo_estimado ?? b.cupo_max ?? 0) -
			Number(a.cupo_estimado ?? a.cupo_max ?? 0);
		if (cupo !== 0) return cupo;

		return normalizarTexto(a.nombre).localeCompare(
			normalizarTexto(b.nombre),
		);
	});
}

function crearEstadoVacio() {
	return {
		ocupadosSalones: new Map(),
		ocupadosDocentes: new Map(),
		asignaciones: [],
	};
}

function registrarOcupacion(estado, candidato) {
	const franjaId = String(candidato.franja.id);
	const salonId = String(candidato.salon.id);
	const docenteId = String(candidato.docente.id);

	if (!estado.ocupadosSalones.has(franjaId))
		estado.ocupadosSalones.set(franjaId, new Set());
	if (!estado.ocupadosDocentes.has(franjaId))
		estado.ocupadosDocentes.set(franjaId, new Set());

	estado.ocupadosSalones.get(franjaId).add(salonId);
	estado.ocupadosDocentes.get(franjaId).add(docenteId);
	estado.asignaciones.push(candidato);
}

function desregistrarOcupacion(estado, candidato) {
	const franjaId = String(candidato.franja.id);
	const salonId = String(candidato.salon.id);
	const docenteId = String(candidato.docente.id);

	estado.asignaciones.pop();

	const salones = estado.ocupadosSalones.get(franjaId);
	const docentes = estado.ocupadosDocentes.get(franjaId);

	salones?.delete(salonId);
	docentes?.delete(docenteId);

	if (salones?.size === 0) estado.ocupadosSalones.delete(franjaId);
	if (docentes?.size === 0) estado.ocupadosDocentes.delete(franjaId);
}

function resolverGreedy(gruposOrdenados, recursos = {}, reglas = {}) {
	logger.info("Iniciando resolución GREEDY...");
	const estado = crearEstadoVacio();
	const resultado = [];
	let exitosas = 0,
		conflictos = 0;

	for (const grupo of gruposOrdenados) {
		const candidatos = generarCandidatosGrupo(
			{ grupo, ...recursos, reglas },
			estado,
		);
		const mejor = elegirMejorCandidato(candidatos, reglas);

		if (!mejor) {
			logger.warn(`Conflicto en grupo ${grupo.id} (${grupo.nombre})`);
			resultado.push({
				grupo,
				status: "conflicto",
				reason: "No existe candidato válido",
				candidato: null,
			});
			conflictos++;
			continue;
		}

		registrarOcupacion(estado, mejor);
		logger.debug(
			`✓ Asignado: ${grupo.nombre} → ${mejor.docente.nombre} (${mejor.franja.dia})`,
		);
		resultado.push({
			grupo,
			status: "confirmado",
			reason: "Asignación greedy",
			candidato: mejor,
		});
		exitosas++;
	}

	logger.info(
		`Resolución GREEDY completada: ${exitosas} exitosas, ${conflictos} conflictos`,
	);
	return resultado;
}

function resolverBacktrackingSimple(
	gruposOrdenados,
	recursos = {},
	reglas = {},
	indice = 0,
	estado = crearEstadoVacio(),
	profundidad = 0,
) {
	const maxProfundidad =
		reglas.max_profundidad_backtracking ??
		DEFAULT_RULES.max_profundidad_backtracking;

	if (profundidad > maxProfundidad) {
		logger.warn(
			`Profundidad de backtracking excedida (${profundidad}), retornando solución parcial`,
		);
		return {
			exito: false,
			grupo_fallido: gruposOrdenados[indice],
			asignaciones: [...estado.asignaciones],
			razon: "max_profundidad_excedida",
		};
	}

	if (indice >= gruposOrdenados.length) {
		logger.info("Solución completa encontrada por backtracking");
		return { exito: true, asignaciones: [...estado.asignaciones] };
	}

	const grupo = gruposOrdenados[indice];
	logger.debug(`Backtracking: Procesando grupo ${grupo.id} (indice: ${indice})`);

	const candidatos = generarCandidatosGrupo(
		{ grupo, ...recursos, reglas },
		estado,
	)
		.map((c) => evaluarCandidato(c, reglas))
		.sort((a, b) => b.score - a.score);

	for (const candidato of candidatos) {
		if (candidato.razones_incumplidas.length > 0) continue;

		registrarOcupacion(estado, candidato);
		const intento = resolverBacktrackingSimple(
			gruposOrdenados,
			recursos,
			reglas,
			indice + 1,
			estado,
			profundidad + 1,
		);

		if (intento.exito) return intento;

		desregistrarOcupacion(estado, candidato);
	}

	logger.warn(
		`Backtracking: Sin solución para grupo ${grupo.id} en profundidad ${profundidad}`,
	);
	return {
		exito: false,
		grupo_fallido: grupo,
		asignaciones: [...estado.asignaciones],
	};
}

function planificarGrupo(input) {
	logger.info(
		`Planificando grupo individual: ${input?.grupo?.nombre || "desconocido"}`,
	);

	if (!input?.grupo) {
		logger.error("planificarGrupo() requiere un objeto grupo");
		throw new Error("planificarGrupo() requiere un objeto grupo");
	}

	const candidatos = generarCandidatosGrupo(input);
	const validos = filtrarRestricciones(candidatos);
	logger.debug(
		`Candidatos totales: ${candidatos.length}, Válidos: ${validos.length}`,
	);

	const mejor = elegirMejorCandidato(candidatos, input.reglas);

	if (!mejor) {
		logger.warn(`No se encontró candidato válido para grupo ${input.grupo.id}`);
		return {
			status: "conflicto",
			reason: "No se encontró una combinación válida",
			candidatos_totales: candidatos.length,
			candidatos_validos: validos.length,
			candidato: null,
		};
	}

	logger.info(
		`✓ Propuesta encontrada: ${mejor.docente.nombre} en ${mejor.salon.codigo}`,
	);
	return {
		status: "propuesto",
		reason: "Se encontró una combinación viable",
		candidatos_totales: candidatos.length,
		candidatos_validos: validos.length,
		candidato: mejor,
	};
}

function generarHorarios(input) {
	logger.info(
		`Iniciando generación de horarios para ${input?.grupos?.length || 0} grupos`,
	);

	const grupos = input?.grupos ?? [];
	const recursos = {
		docentes: input?.docentes ?? [],
		salones: input?.salones ?? [],
		franjas: input?.franjas ?? [],
	};
	const reglas = input?.reglas ?? {};
	const estrategia = normalizarTexto(
		reglas.estrategia ?? DEFAULT_RULES.estrategia,
	);

	logger.info(`Estrategia seleccionada: ${estrategia}`);
	logger.debug(`Recursos: ${recursos.docentes.length} docentes, ${recursos.salones.length} salones, ${recursos.franjas.length} franjas`);

	const gruposOrdenados = ordenarGrupos(grupos, recursos, reglas);

	if (estrategia === "greedy") {
		const asignaciones = resolverGreedy(gruposOrdenados, recursos, reglas);
		logger.info("Horarios generados con estrategia GREEDY");
		return {
			estrategia: "greedy",
			grupos_ordenados: gruposOrdenados,
			asignaciones,
		};
	}

	logger.info("Iniciando backtracking simple...");
	const intento = resolverBacktrackingSimple(
		gruposOrdenados,
		recursos,
		reglas,
	);

	if (intento.exito) {
		logger.info("Horarios completamente generados con backtracking");
		return {
			estrategia: "backtracking_simple",
			grupos_ordenados: gruposOrdenados,
			asignaciones: intento.asignaciones.map((candidato) => ({
				grupo: candidato.grupo,
				status: "confirmado",
				reason: "Asignación por backtracking",
				candidato,
			})),
		};
	}

	logger.warn(
		`Backtracking incompleto: ${intento.asignaciones.length} de ${grupos.length} grupos asignados`,
	);
	return {
		estrategia: "backtracking_simple",
		grupos_ordenados: gruposOrdenados,
		asignaciones: [
			...intento.asignaciones.map((candidato) => ({
				grupo: candidato.grupo,
				status: "confirmado",
				reason: "Asignación parcial por backtracking",
				candidato,
			})),
			{
				grupo: intento.grupo_fallido,
				status: "conflicto",
				reason: "Backtracking no encontró solución completa",
				candidato: null,
			},
		],
	};
}

export {
	DEFAULT_RULES,
	contarOpcionesGrupo,
	docenteDisponibleEnFranja,
	elegirMejorCandidato,
	esAulaCompatible,
	evaluarCandidato,
	filtrarRestricciones,
	generarCandidatosGrupo,
	generarHorarios,
	generarRazonesIncumplidas,
	horasBloque,
	normalizarTexto,
	ordenarGrupos,
	planificarGrupo,
	resolverBacktrackingSimple,
	resolverGreedy,
	salonTieneCupo,
};
