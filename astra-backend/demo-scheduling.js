/**
 * demo-scheduling.js — Archivo de demostración del motor de asignación
 *
 * Este archivo contiene datos de prueba y ejemplos de cómo usar el motor.
 * Ejecución: node demo-scheduling.js (desde el directorio astra-backend)
 */

import SchedulingService from "./src/services/schedulingService.js";
import { Logger } from "./src/utils/logger.js";

const logger = new Logger("DemoScheduling");

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA
// ─────────────────────────────────────────────────────────────────────────────

const gruposDePrueba = [
	{
		id: 1,
		materia_codigo: "IS-201",
		nombre: "Cálculo Diferencial",
		jornada: "Diurna",
		modalidad: "presencial",
		sede_codigo: "NORTE",
		cupo_max: 30,
		cupo_estimado: 28,
		tipo_aula_requerida: "presencial",
		prioridad: 5,
	},
	{
		id: 2,
		materia_codigo: "IS-205",
		nombre: "Programación I",
		jornada: "Diurna",
		modalidad: "presencial",
		sede_codigo: "NORTE",
		cupo_max: 30,
		cupo_estimado: 30,
		tipo_aula_requerida: "laboratorio",
		prioridad: 10,
	},
	{
		id: 3,
		materia_codigo: "IS-703",
		nombre: "Redes I",
		jornada: "Diurna",
		modalidad: "presencial",
		sede_codigo: "NORTE",
		cupo_max: 25,
		cupo_estimado: 24,
		tipo_aula_requerida: "laboratorio",
		prioridad: 20,
	},
	{
		id: 4,
		materia_codigo: "IS-104",
		nombre: "Álgebra Lineal",
		jornada: "Nocturna",
		modalidad: "presencial",
		sede_codigo: "SUR",
		cupo_max: 35,
		cupo_estimado: 32,
		tipo_aula_requerida: "presencial",
		prioridad: 8,
	},
];

const docentesDePrueba = [
	{
		id: 10,
		nombre: "Dr. Juan Pérez",
		disponibilidad: "Diurna",
		carga_max_horas: 40,
		horas_asignadas: 15,
	},
	{
		id: 11,
		nombre: "Dra. María García",
		disponibilidad: "Diurna",
		carga_max_horas: 20,
		horas_asignadas: 8,
	},
	{
		id: 12,
		nombre: "Ing. Carlos López",
		disponibilidad: "Ambas",
		carga_max_horas: 30,
		horas_asignadas: 12,
	},
	{
		id: 13,
		nombre: "Prof. Ana Martínez",
		disponibilidad: "Nocturna",
		carga_max_horas: 25,
		horas_asignadas: 5,
	},
];

const salonesDePrueba = [
	{
		id: 20,
		codigo: "AU-101",
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 30,
	},
	{
		id: 21,
		codigo: "LAB-201",
		sede_codigo: "NORTE",
		tipo: "laboratorio",
		capacidad: 30,
	},
	{
		id: 22,
		codigo: "AU-102",
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 40,
	},
	{
		id: 23,
		codigo: "AU-301",
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
	},
];

const franjasDePrueba = [
	{
		id: 100,
		dia: "Lunes",
		jornada: "Diurna",
		hora_inicio: "07:00",
		hora_fin: "10:00",
	},
	{
		id: 101,
		dia: "Martes",
		jornada: "Diurna",
		hora_inicio: "10:00",
		hora_fin: "13:00",
	},
	{
		id: 102,
		dia: "Miércoles",
		jornada: "Diurna",
		hora_inicio: "14:00",
		hora_fin: "17:00",
	},
	{
		id: 103,
		dia: "Jueves",
		jornada: "Diurna",
		hora_inicio: "07:00",
		hora_fin: "10:00",
	},
	{
		id: 104,
		dia: "Viernes",
		jornada: "Diurna",
		hora_inicio: "10:00",
		hora_fin: "13:00",
	},
	{
		id: 200,
		dia: "Lunes",
		jornada: "Nocturna",
		hora_inicio: "18:00",
		hora_fin: "21:00",
	},
	{
		id: 201,
		dia: "Miércoles",
		jornada: "Nocturna",
		hora_inicio: "18:00",
		hora_fin: "21:00",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS
// ─────────────────────────────────────────────────────────────────────────────

async function runDemos() {
	logger.info("=".repeat(80));
	logger.info("DEMO: Motor de Asignación de Horarios - AstraSchedule");
	logger.info("=".repeat(80));

	// ─── Demo 1: Validación de datos ──────────────────────────────────────────
	logger.info("\n📋 Demo 1: Validando datos de entrada...");
	const validacion = SchedulingService.validarInput({
		grupos: gruposDePrueba,
		docentes: docentesDePrueba,
		salones: salonesDePrueba,
		franjas: franjasDePrueba,
	});
	logger.info(
		`Validación: ${validacion.valid ? "✓ PASADA" : "✗ FALLOS"}`,
	);
	if (!validacion.valid) {
		logger.error("Errores encontrados:", validacion.errors);
	}

	// ─── Demo 2: Planificación de grupo individual ─────────────────────────────
	logger.info("\n🎯 Demo 2: Planificando grupo individual...");
	const planificacion = await SchedulingService.planificarGrupoIndividual(
		gruposDePrueba[0],
		docentesDePrueba,
		salonesDePrueba,
		franjasDePrueba,
		{ capacidad_tolerancia: 1 },
	);
	logger.info(`Resultado: ${planificacion.success ? "✓ ÉXITO" : "✗ ERROR"}`);
	if (planificacion.success && planificacion.data.candidato) {
		logger.info(`  Propuesta: ${planificacion.data.candidato.docente.nombre} `
			+ `en ${planificacion.data.candidato.salon.codigo} `
			+ `(${planificacion.data.candidato.franja.dia})`);
	}

	// ─── Demo 3: Generación con estrategia GREEDY ──────────────────────────────
	logger.info("\n⚡ Demo 3: Generando horarios (GREEDY)...");
	const horarioGreedy = await SchedulingService.generarHorarios({
		grupos: gruposDePrueba,
		docentes: docentesDePrueba,
		salones: salonesDePrueba,
		franjas: franjasDePrueba,
		reglas: { estrategia: "greedy" },
	});

	if (horarioGreedy.success) {
		logger.info(`✓ Éxito: ${horarioGreedy.message}`);
		logger.info(
			`  Estadísticas:`,
			horarioGreedy.data.estadisticas,
		);

		// Mostrar asignaciones confirmadas
		const confirmadas = horarioGreedy.data.asignaciones.filter(
			(a) => a.status === "confirmado",
		);
		logger.info(`\n  Asignaciones confirmadas:`);
		confirmadas.forEach((asignacion) => {
			const c = asignacion.candidato;
			logger.info(
				`    • ${asignacion.grupo.nombre} → ${c.docente.nombre} `
					+ `(${c.salon.codigo}, ${c.franja.dia})`,
			);
		});

		// Mostrar conflictos
		const conflictos = horarioGreedy.data.asignaciones.filter(
			(a) => a.status === "conflicto",
		);
		if (conflictos.length > 0) {
			logger.warn(`\n  Conflictos encontrados:`);
			conflictos.forEach((c) => {
				logger.warn(`    • ${c.grupo.nombre}: ${c.reason}`);
			});
		}
	} else {
		logger.error(`✗ Error: ${horarioGreedy.error}`);
	}

	// ─── Demo 4: Generación con estrategia BACKTRACKING ──────────────────────
	logger.info(
		"\n🔄 Demo 4: Generando horarios (BACKTRACKING)...",
	);
	const horarioBacktracking = await SchedulingService.generarHorarios({
		grupos: gruposDePrueba,
		docentes: docentesDePrueba,
		salones: salonesDePrueba,
		franjas: franjasDePrueba,
		reglas: { estrategia: "backtracking_simple", max_profundidad_backtracking: 50 },
	});

	if (horarioBacktracking.success) {
		logger.info(`✓ Éxito: ${horarioBacktracking.message}`);
		logger.info(
			`  Estadísticas:`,
			horarioBacktracking.data.estadisticas,
		);
	} else {
		logger.error(`✗ Error: ${horarioBacktracking.error}`);
	}

	logger.info("\n" + "=".repeat(80));
	logger.info("Demo completada");
	logger.info("=".repeat(80));
}

// Ejecutar demostraciones
runDemos().catch((err) => {
	logger.error("Error no controlado:", err);
	process.exit(1);
});
