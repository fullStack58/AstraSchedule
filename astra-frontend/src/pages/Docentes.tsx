// src/pages/Docentes.tsx
import { useState, useMemo } from "react";
import { docentesApi } from "../services/api";
import { useApi } from "../hooks/useApi";
import { StatCard } from "../components/atoms/index";
import type { Docente } from "../types/schema";

const MOCK: Docente[] = [
	{
		id: 1,
		identificacion: "1",
		nombre: "Prof. García",
		email: "garcia@uniajc.edu.co",
		tipo: "TC",
		carga_max_horas: 40,
		disponibilidad: "Ambas",
		activo: true,
		horas_asignadas: 44,
	},
	{
		id: 2,
		identificacion: "2",
		nombre: "Prof. Torres",
		email: "torres@uniajc.edu.co",
		tipo: "TC",
		carga_max_horas: 40,
		disponibilidad: "Diurna",
		activo: true,
		horas_asignadas: 30,
	},
	{
		id: 3,
		identificacion: "3",
		nombre: "Prof. Morales",
		email: "morales@uniajc.edu.co",
		tipo: "MT",
		carga_max_horas: 20,
		disponibilidad: "Nocturna",
		activo: true,
		horas_asignadas: 22,
	},
	{
		id: 4,
		identificacion: "4",
		nombre: "Prof. López",
		email: "lopez@uniajc.edu.co",
		tipo: "MT",
		carga_max_horas: 20,
		disponibilidad: "Ambas",
		activo: true,
		horas_asignadas: 16,
	},
	{
		id: 5,
		identificacion: "5",
		nombre: "Prof. Vargas",
		email: "vargas@uniajc.edu.co",
		tipo: "TC",
		carga_max_horas: 40,
		disponibilidad: "Diurna",
		activo: true,
		horas_asignadas: 0,
	},
	{
		id: 6,
		identificacion: "6",
		nombre: "Prof. Ramírez",
		email: "ramirez@uniajc.edu.co",
		tipo: "MT",
		carga_max_horas: 20,
		disponibilidad: "Nocturna",
		activo: true,
		horas_asignadas: 21,
	},
];

const AV_COLORS = [
	{ bg: "#EEF2FF", color: "#4A7CF7" },
	{ bg: "#EDE9FE", color: "#7C3AED" },
	{ bg: "#D1FAE5", color: "#065F46" },
	{ bg: "#FEF3C7", color: "#92400E" },
	{ bg: "#E0F2FE", color: "#0369A1" },
	{ bg: "#FCE7F3", color: "#9D174D" },
];

export default function Docentes() {
	const { data, loading, error } = useApi<Docente[]>(
		() => docentesApi.getAll() as Promise<{ data: Docente[] }>,
	);
	const docentes: Docente[] = data ?? MOCK;

	const [filtroTipo, setFiltroTipo] = useState("todos");
	const [filtroJornada, setFiltroJornada] = useState("todas");
	const [busqueda, setBusqueda] = useState("");

	const filtrados = useMemo(
		() =>
			docentes.filter((d) => {
				if (filtroTipo !== "todos" && d.tipo !== filtroTipo)
					return false;
				if (
					filtroJornada !== "todas" &&
					d.disponibilidad !== filtroJornada &&
					d.disponibilidad !== "Ambas"
				)
					return false;
				if (
					busqueda &&
					!d.nombre.toLowerCase().includes(busqueda.toLowerCase())
				)
					return false;
				return true;
			}),
		[docentes, filtroTipo, filtroJornada, busqueda],
	);

	const cntTC = docentes.filter((d) => d.tipo === "TC").length;
	const cntMT = docentes.filter((d) => d.tipo === "MT").length;
	const cntOver = docentes.filter(
		(d) => (d.horas_asignadas ?? 0) > d.carga_max_horas,
	).length;
	const cntFree = docentes.filter(
		(d) => (d.horas_asignadas ?? 0) === 0,
	).length;

	return (
		<>
			<div className="page-title">Docentes</div>
			<div className="page-sub">
				Disponibilidad y carga académica · {docentes.length} docentes
				activos
				{!data && !loading && (
					<span
						style={{
							marginLeft: 8,
							fontSize: 11,
							color: "var(--amber-txt)",
						}}
					>
						⚠️ Datos de muestra
					</span>
				)}
			</div>

			<div className="stats-grid">
				<StatCard label="Docentes TC" value={cntTC} sub="40h máx/sem" />
				<StatCard label="Docentes MT" value={cntMT} sub="20h máx/sem" />
				<StatCard
					label="Sobrecarga"
					value={cntOver}
					sub="Exceden límite"
					subVariant="down"
				/>
				<StatCard
					label="Sin asignación"
					value={cntFree}
					sub="Disponibles"
					subVariant="warn"
				/>
			</div>

			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 12,
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<input
					placeholder="Buscar docente..."
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					style={{
						background: "var(--white)",
						border: "1px solid var(--border2)",
						borderRadius: "var(--r)",
						padding: "7px 12px",
						fontSize: 12,
						fontFamily: "var(--font)",
						width: 220,
						color: "var(--text)",
						outline: "none",
					}}
				/>
			</div>

			<div className="filter-bar">
				<span
					style={{
						fontSize: 10,
						color: "var(--text3)",
						alignSelf: "center",
						marginRight: 2,
					}}
				>
					Tipo:
				</span>
				{[
					["todos", "Todos"],
					["TC", `TC (${cntTC})`],
					["MT", `MT (${cntMT})`],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filtroTipo === v ? "active" : ""}`}
						onClick={() => setFiltroTipo(v)}
					>
						{l}
					</button>
				))}
				<span
					style={{
						fontSize: 10,
						color: "var(--text3)",
						alignSelf: "center",
						marginLeft: 8,
						marginRight: 2,
					}}
				>
					Jornada:
				</span>
				{[
					["todas", "Todas"],
					["Diurna", "Diurna"],
					["Nocturna", "Nocturna"],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filtroJornada === v ? "active" : ""}`}
						onClick={() => setFiltroJornada(v)}
					>
						{l}
					</button>
				))}
			</div>

			{loading && (
				<div
					style={{
						padding: "20px",
						color: "var(--text3)",
						fontSize: 12,
					}}
				>
					Cargando docentes...
				</div>
			)}
			{error && (
				<div
					style={{
						padding: "12px",
						color: "var(--amber-txt)",
						fontSize: 12,
						background: "var(--amber-bg)",
						borderRadius: "var(--r)",
						marginBottom: 12,
					}}
				>
					⚠️ {error}
				</div>
			)}

			<div className="table-wrap">
				<div
					style={{
						padding: "8px 14px",
						borderBottom: "1px solid var(--border)",
						fontSize: 11,
						color: "var(--text3)",
					}}
				>
					Mostrando{" "}
					<strong style={{ color: "var(--text)" }}>
						{filtrados.length}
					</strong>{" "}
					de {docentes.length} docentes
				</div>
				{/* Header */}
				<div
					className="teacher-row"
					style={{
						background: "#F9FAFB",
						borderBottom: "1px solid var(--border)",
					}}
				>
					<div />
					{[
						"Docente",
						"Tipo",
						"Carga horaria",
						"Jornada",
						"Estado",
					].map((h) => (
						<div
							key={h}
							style={{
								fontSize: 10,
								fontWeight: 600,
								color: "var(--text3)",
								textTransform: "uppercase",
								letterSpacing: ".07em",
							}}
						>
							{h}
						</div>
					))}
				</div>
				{filtrados.length === 0 ? (
					<div
						style={{
							padding: "32px",
							textAlign: "center",
							color: "var(--text3)",
						}}
					>
						Sin resultados
					</div>
				) : (
					filtrados.map((d, i) => {
						const pct = Math.min(
							((d.horas_asignadas ?? 0) / d.carga_max_horas) *
								100,
							100,
						);
						const over =
							(d.horas_asignadas ?? 0) > d.carga_max_horas;
						const warn = !over && pct > 85;
						const fillC = over
							? "load-over"
							: warn
								? "load-warn"
								: "load-ok";
						const avC = AV_COLORS[i % AV_COLORS.length];
						const ini = d.nombre
							.split(" ")
							.map((w) => w[0])
							.join("")
							.substring(0, 2)
							.toUpperCase();
						const st = over
							? {
									dot: "#F59E0B",
									txt: "#B45309",
									label: "Sobrecarga",
								}
							: (d.horas_asignadas ?? 0) === 0
								? {
										dot: "#D1D5DB",
										txt: "var(--text3)",
										label: "Sin asig.",
									}
								: {
										dot: "#22C55E",
										txt: "#16A34A",
										label: "Activo",
									};
						return (
							<div key={d.id} className="teacher-row">
								<div
									className="t-av"
									style={{
										background: avC.bg,
										color: avC.color,
									}}
								>
									{ini}
								</div>
								<div>
									<div className="t-name">{d.nombre}</div>
									<div className="t-email">{d.email}</div>
								</div>
								<span
									className={`tag ${d.tipo === "TC" ? "tag-blue" : "tag-purple"}`}
								>
									{d.tipo}
								</span>
								<div className="load-wrap">
									<div className="load-top">
										<span style={{ color: "var(--text3)" }}>
											{d.horas_asignadas ?? 0}h/
											{d.carga_max_horas}h
										</span>
										<span
											style={{
												color: over
													? "var(--red-txt)"
													: "var(--green-txt)",
											}}
										>
											{Math.round(pct)}%
										</span>
									</div>
									<div className="load-bar">
										<div
											className={`load-fill ${fillC}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
								<div
									style={{
										fontSize: 11,
										color: "var(--text2)",
									}}
								>
									{d.disponibilidad}
								</div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<div
										className="status-dot"
										style={{ background: st.dot }}
									/>
									<span
										style={{ fontSize: 11, color: st.txt }}
									>
										{st.label}
									</span>
								</div>
							</div>
						);
					})
				)}
			</div>
		</>
	);
}
