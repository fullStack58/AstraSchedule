// src/pages/Grupos.tsx
import { useState, useMemo } from "react";
import { gruposApi } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Grupo } from "../types/schema";

const TAG: Record<string, string> = {
	conflicto: "red",
	confirmado: "green",
	propuesto: "blue",
	sin_horario: "gray",
	abierto: "gray",
};

// Datos de muestra mientras el backend no esté corriendo
const MOCK: Grupo[] = [
	{
		id: 1,
		numero: "2303A",
		materia_codigo: "MAT-CD",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 2,
		numero: "2303A",
		materia_codigo: "MAT-AL",
		materia_nombre: "Álgebra Lineal",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 3,
		numero: "2303A",
		materia_codigo: "MAT-PI",
		materia_nombre: "Programación I",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 18,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "propuesto",
	},
	{
		id: 4,
		numero: "2303B",
		materia_codigo: "MAT-CD",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "conflicto",
	},
	{
		id: 5,
		numero: "241A",
		materia_codigo: "MAT-CDN",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 6,
		numero: "241A",
		materia_codigo: "MAT-PIN",
		materia_nombre: "Programación I",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "NORTE",
		cupo_max: 17,
		estado: "abierto",
		periodo_codigo: "2025-1",
	},
	{
		id: 7,
		numero: "S241E",
		materia_codigo: "MAT-CDS",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "SUR",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 8,
		numero: "S241A",
		materia_codigo: "MAT-ALS",
		materia_nombre: "Álgebra Lineal",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "SUR",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "propuesto",
	},
	{
		id: 9,
		numero: "2303A",
		materia_codigo: "MAT-BD",
		materia_nombre: "Bases de Datos I",
		semestre: 4,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 10,
		numero: "2303A",
		materia_codigo: "MAT-RE",
		materia_nombre: "Redes I",
		semestre: 7,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
	},
	{
		id: 11,
		numero: "241A",
		materia_codigo: "MAT-ISO",
		materia_nombre: "Ingeniería de Software I",
		semestre: 5,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 12,
		numero: "S341E",
		materia_codigo: "MAT-FI",
		materia_nombre: "Física I",
		semestre: 3,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "SUR",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 13,
		numero: "2303A",
		materia_codigo: "MAT-MD",
		materia_nombre: "Matemáticas Discretas",
		semestre: 2,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "confirmado",
	},
	{
		id: 14,
		numero: "241A",
		materia_codigo: "MAT-MN",
		materia_nombre: "Métodos Numéricos",
		semestre: 6,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Nocturna",
		sede_codigo: "NORTE",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
	},
	{
		id: 15,
		numero: "S241A",
		materia_codigo: "MAT-CI",
		materia_nombre: "Cálculo Integral",
		semestre: 3,
		programa_codigo: "IS",
		modalidad: "presencial",
		jornada_codigo: "Diurna",
		sede_codigo: "SUR",
		cupo_max: 35,
		estado: "abierto",
		periodo_codigo: "2025-1",
		horario_estado: "propuesto",
	},
];

type FiltroPrograma = "todos" | "IS" | "IE";
type FiltroJornada = "todas" | "Diurna" | "Nocturna" | "virtual";
type FiltroSede = "todas" | "NORTE" | "SUR";
type FiltroEstado =
	| "todos"
	| "confirmado"
	| "propuesto"
	| "conflicto"
	| "sin_horario";

export default function Grupos() {
	const { data, loading, error } = useApi<Grupo[]>(
		() => gruposApi.getAll() as Promise<{ data: Grupo[] }>,
	);
	const grupos: Grupo[] = data ?? MOCK;

	const [programa, setPrograma] = useState<FiltroPrograma>("todos");
	const [jornada, setJornada] = useState<FiltroJornada>("todas");
	const [sede, setSede] = useState<FiltroSede>("todas");
	const [estado, setEstado] = useState<FiltroEstado>("todos");
	const [busqueda, setBusqueda] = useState("");

	// Conteos para los chips
	const cntIS = grupos.filter((g) => g.programa_codigo === "IS").length;
	const cntIE = grupos.filter((g) => g.programa_codigo === "IE").length;
	const cntD = grupos.filter((g) => g.jornada_codigo === "Diurna").length;
	const cntN = grupos.filter((g) => g.jornada_codigo === "Nocturna").length;
	const cntV = grupos.filter((g) => g.modalidad === "virtual").length;
	const cntConf = grupos.filter(
		(g) => g.horario_estado === "conflicto",
	).length;
	const cntSin = grupos.filter((g) => !g.horario_estado).length;

	// Filtrado reactivo
	const filtrados = useMemo(() => {
		return grupos.filter((g) => {
			if (programa !== "todos" && g.programa_codigo !== programa)
				return false;
			if (jornada === "virtual" && g.modalidad !== "virtual")
				return false;
			if (
				jornada !== "todas" &&
				jornada !== "virtual" &&
				g.jornada_codigo !== jornada
			)
				return false;
			if (sede !== "todas" && g.sede_codigo !== sede) return false;
			if (estado === "sin_horario" && g.horario_estado) return false;
			if (
				estado !== "todos" &&
				estado !== "sin_horario" &&
				g.horario_estado !== estado
			)
				return false;
			if (busqueda) {
				const q = busqueda.toLowerCase();
				return (
					g.numero.toLowerCase().includes(q) ||
					g.materia_nombre.toLowerCase().includes(q) ||
					g.materia_codigo.toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [grupos, programa, jornada, sede, estado, busqueda]);

	function estadoTag(g: Grupo) {
		if (g.horario_estado === "conflicto") return "red";
		if (g.horario_estado === "confirmado") return "green";
		if (g.horario_estado === "propuesto") return "blue";
		return "gray";
	}
	function estadoLabel(g: Grupo) {
		return g.horario_estado?.replace("_", " ") ?? "sin horario";
	}

	return (
		<>
			<div className="page-title">Grupos</div>
			<div className="page-sub">
				Gestión por programa, semestre y jornada
				{!data && !loading && (
					<span
						style={{
							marginLeft: 8,
							fontSize: 11,
							color: "var(--amber-txt)",
						}}
					>
						⚠️ Mostrando datos de muestra — backend no disponible
					</span>
				)}
			</div>

			{/* Búsqueda */}
			<div style={{ marginBottom: 12 }}>
				<input
					placeholder="Buscar por código, materia..."
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					style={{
						background: "var(--white)",
						border: "1px solid var(--border2)",
						borderRadius: "var(--r)",
						padding: "7px 12px",
						fontSize: 12,
						fontFamily: "var(--font)",
						width: 280,
						color: "var(--text)",
						outline: "none",
					}}
				/>
			</div>

			{/* Filtros — Programa */}
			<div className="filter-bar">
				<span
					style={{
						fontSize: 10,
						color: "var(--text3)",
						alignSelf: "center",
						marginRight: 2,
					}}
				>
					Programa:
				</span>
				{(
					[
						["todos", `Todos (${grupos.length})`],
						["IS", `IS (${cntIS})`],
						["IE", `IE (${cntIE})`],
					] as const
				).map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${programa === v ? "active" : ""}`}
						onClick={() => setPrograma(v)}
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
				{(
					[
						["todas", "Todas"],
						["Diurna", `Diurna (${cntD})`],
						["Nocturna", `Nocturna (${cntN})`],
						["virtual", `Virtual (${cntV})`],
					] as const
				).map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${jornada === v ? "active" : ""}`}
						onClick={() => setJornada(v)}
					>
						{l}
					</button>
				))}
			</div>

			{/* Filtros — Sede + Estado */}
			<div className="filter-bar" style={{ marginTop: -6 }}>
				<span
					style={{
						fontSize: 10,
						color: "var(--text3)",
						alignSelf: "center",
						marginRight: 2,
					}}
				>
					Sede:
				</span>
				{(
					[
						["todas", "Todas"],
						["NORTE", "Norte"],
						["SUR", "Sur"],
					] as const
				).map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${sede === v ? "active" : ""}`}
						onClick={() => setSede(v)}
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
					Estado:
				</span>
				{(
					[
						["todos", "Todos"],
						["confirmado", "Confirmado"],
						["propuesto", "Propuesto"],
						["conflicto", `Conflicto (${cntConf})`],
						["sin_horario", `Sin horario (${cntSin})`],
					] as const
				).map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${estado === v ? "active" : ""}`}
						onClick={() => setEstado(v)}
					>
						{l}
					</button>
				))}
			</div>

			{/* Tabla */}
			{loading ? (
				<div
					style={{
						padding: "40px",
						textAlign: "center",
						color: "var(--text3)",
					}}
				>
					<i
						className="ti ti-loader"
						style={{
							fontSize: 20,
							animation: "spin 1s linear infinite",
						}}
					/>{" "}
					Cargando grupos...
				</div>
			) : error ? (
				<div
					style={{
						padding: "20px",
						color: "var(--amber-txt)",
						fontSize: 12,
						background: "var(--amber-bg)",
						borderRadius: "var(--r)",
						marginBottom: 12,
					}}
				>
					⚠️ {error} — mostrando datos de muestra
				</div>
			) : null}

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
					de {grupos.length} grupos
				</div>
				<div style={{ overflowX: "auto" }}>
					<table style={{ tableLayout: "fixed", minWidth: 700 }}>
						<thead>
							<tr>
								<th style={{ width: 100 }}>Código</th>
								<th>Materia</th>
								<th style={{ width: 38 }}>Sem</th>
								<th style={{ width: 60 }}>Prog</th>
								<th style={{ width: 80 }}>Modalidad</th>
								<th style={{ width: 72 }}>Jornada</th>
								<th style={{ width: 52 }}>Sede</th>
								<th style={{ width: 46 }}>Cupo</th>
								<th style={{ width: 90 }}>Estado</th>
							</tr>
						</thead>
						<tbody>
							{filtrados.length === 0 ? (
								<tr>
									<td
										colSpan={9}
										style={{
											textAlign: "center",
											padding: "32px",
											color: "var(--text3)",
										}}
									>
										No hay grupos con los filtros
										seleccionados
									</td>
								</tr>
							) : (
								filtrados.map((g, i) => (
									<tr key={`${g.id}-${i}`}>
										<td
											className="mono"
											style={{
												fontSize: 10,
												color: "var(--blue)",
												fontWeight: 700,
											}}
										>
											{g.numero}
										</td>
										<td
											style={{
												fontWeight: 500,
												color: "var(--text)",
											}}
										>
											{g.materia_nombre}
										</td>
										<td style={{ textAlign: "center" }}>
											{g.semestre}
										</td>
										<td>
											<span className="tag tag-blue">
												{g.programa_codigo}
											</span>
										</td>
										<td>
											{g.modalidad === "virtual"
												? "Virtual"
												: "Presencial"}
										</td>
										<td>{g.jornada_codigo}</td>
										<td>{g.sede_codigo ?? "—"}</td>
										<td style={{ textAlign: "center" }}>
											{g.cupo_max}
										</td>
										<td>
											<span
												className={`tag tag-${estadoTag(g)}`}
											>
												{estadoLabel(g)}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
		</>
	);
}
