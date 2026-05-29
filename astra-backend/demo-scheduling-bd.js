/**
 * demo-scheduling-bd.js — Demo de integración con BD
 *
 * Este archivo demuestra cómo usar el motor de asignación con datos reales
 * obtenidos desde PostgreSQL.
 *
 * Ejecución: node demo-scheduling-bd.js
 */

import DataService from "./src/services/dataService.js";
import SchedulingService from "./src/services/schedulingService.js";
import { Logger } from "./src/utils/logger.js";

const logger = new Logger("DemoBD");

async function runDemo() {
	logger.info("=".repeat(80));
	logger.info("DEMO: Motor de Asignación con Datos desde BD - AstraSchedule");
	logger.info("=".repeat(80));

	try {
		// ─── Paso 1: Obtener período activo ───────────────────────────────────
		logger.info("\n📅 Paso 1: Obteniendo período académico activo...");
		const periodo = await DataService.obtenerPeriodoActivo();

		if (!periodo) {
			logger.error(
				"❌ No hay período académico activo en la BD",
			);
			logger.warn("Nota: Ejecuta primero 'npm run bootstrap' para cargar datos");
			process.exit(1);
		}

		logger.info(`✓ Período encontrado: ${periodo.codigo} - ${periodo.nombre}`);

		// ─── Paso 2: Obtener datos de la BD ───────────────────────────────────
		logger.info("\n📊 Paso 2: Obteniendo datos desde la BD...");
		const datos = await DataService.obtenerDatosCompletos(periodo.id);

		logger.info(`✓ Datos obtenidos:`);
		logger.info(`  • ${datos.grupos.length} grupos`);
		logger.info(`  • ${datos.docentes.length} docentes`);
		logger.info(`  • ${datos.salones.length} salones`);
		logger.info(`  • ${datos.franjas.length} franjas horarias`);

		if (datos.grupos.length === 0) {
			logger.warn("⚠️  No hay grupos inscritos en este período");
			logger.warn("Nota: Asegúrate de tener datos en la tabla 'grupos'");
			process.exit(1);
		}

		// ─── Paso 3: Validar datos ────────────────────────────────────────────
		logger.info("\n✅ Paso 3: Validando integridad de datos...");
		const validacion = SchedulingService.validarInput(datos);

		if (!validacion.valid) {
			logger.error("❌ Validación fallida:");
			validacion.errors.forEach((err) => logger.error(`  • ${err}`));
			process.exit(1);
		}

		logger.info("✓ Datos válidos y listos para procesamiento");

		// ─── Paso 4: Mostrar muestra de datos ──────────────────────────────────
		logger.info("\n📋 Paso 4: Muestra de datos de la BD...");

		if (datos.grupos.length > 0) {
			logger.info(`\nPrimer grupo:`);
			logger.info(
				`  ${JSON.stringify(datos.grupos[0], null, 2)}`,
			);
		}

		if (datos.docentes.length > 0) {
			logger.info(`\nPrimer docente:`);
			logger.info(
				`  ${JSON.stringify(datos.docentes[0], null, 2)}`,
			);
		}

		if (datos.salones.length > 0) {
			logger.info(`\nPrimer salón:`);
			logger.info(
				`  ${JSON.stringify(datos.salones[0], null, 2)}`,
			);
		}

		if (datos.franjas.length > 0) {
			logger.info(`\nPrimera franja:`);
			logger.info(
				`  ${JSON.stringify(datos.franjas[0], null, 2)}`,
			);
		}

		// ─── Paso 5: Generar horarios con GREEDY ──────────────────────────────
		logger.info(
			"\n⚡ Paso 5: Generando horarios con estrategia GREEDY...",
		);
		const horarioGreedy = await SchedulingService.generarHorarios({
			...datos,
			reglas: { estrategia: "greedy" },
		});

		if (horarioGreedy.success) {
			logger.info(`✓ Éxito: ${horarioGreedy.message}`);
			logger.info(`  Estadísticas:`, horarioGreedy.data.estadisticas);

			const confirmadas = horarioGreedy.data.asignaciones.filter(
				(a) => a.status === "confirmado",
			);
			const conflictos = horarioGreedy.data.asignaciones.filter(
				(a) => a.status === "conflicto",
			);

			if (confirmadas.length > 0) {
				logger.info(`\n  Primeras 3 asignaciones confirmadas:`);
				confirmadas.slice(0, 3).forEach((a, idx) => {
					logger.info(
						`    ${idx + 1}. ${a.grupo.nombre.substring(0, 30)} ✓`,
					);
				});
			}

			if (conflictos.length > 0) {
				logger.warn(`\n  Conflictos: ${conflictos.length}`);
				conflictos.slice(0, 3).forEach((c, idx) => {
					logger.warn(
						`    ${idx + 1}. ${c.grupo.nombre.substring(0, 30)} - ${c.reason}`,
					);
				});
			}
		} else {
			logger.error(`❌ Error: ${horarioGreedy.error}`);
		}

		// ─── Paso 6: Generar horarios con BACKTRACKING ─────────────────────────
		logger.info(
			"\n🔄 Paso 6: Generando horarios con estrategia BACKTRACKING...",
		);
		const horarioBacktracking = await SchedulingService.generarHorarios({
			...datos,
			reglas: {
				estrategia: "backtracking_simple",
				max_profundidad_backtracking: 50,
			},
		});

		if (horarioBacktracking.success) {
			logger.info(`✓ Éxito: ${horarioBacktracking.message}`);
			logger.info(
				`  Estadísticas:`,
				horarioBacktracking.data.estadisticas,
			);
		} else {
			logger.error(`❌ Error: ${horarioBacktracking.error}`);
		}

		// ─── Paso 7: Comparación de estrategias ────────────────────────────────
		logger.info("\n📊 Paso 7: Comparación de estrategias...");
		logger.info(
			`\n  GREEDY:       ${horarioGreedy.data.estadisticas.confirmados}/${horarioGreedy.data.estadisticas.total_grupos} grupos (${horarioGreedy.data.estadisticas.tasa_exito * 100}%)`,
		);
		logger.info(
			`  BACKTRACKING: ${horarioBacktracking.data.estadisticas.confirmados}/${horarioBacktracking.data.estadisticas.total_grupos} grupos (${horarioBacktracking.data.estadisticas.tasa_exito * 100}%)`,
		);

		// ─── Paso 8: Resumen final ────────────────────────────────────────────
		logger.info("\n" + "=".repeat(80));
		logger.info("✅ Demo completada exitosamente");
		logger.info("=".repeat(80));

		logger.info("\n📝 Próximos pasos:");
		logger.info("1. Usar el servidor: npm run dev");
		logger.info(
			"2. Llamar a: GET /api/scheduling/generate-db?periodoId=" +
				periodo.id,
		);
		logger.info("3. O: GET /api/scheduling/generate-db?guardar=true (para guardar)");
	} catch (error) {
		logger.error("❌ Error fatal:", error.message);
		logger.error(error.stack);
		process.exit(1);
	}
}

// Ejecutar demo
runDemo();
