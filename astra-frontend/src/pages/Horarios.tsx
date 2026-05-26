// src/pages/Horarios.tsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { horariosApi } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Horario } from "../types/schema";

const MOCK: Horario[] = [
	{
		id: 1,
		estado: "conflicto",
		grupo_id: 1,
		grupo_numero: "2303A",
		materia_codigo: "MAT-CD",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		docente_id: 1,
		docente_nombre: "P. García",
		docente_tipo: "TC",
		salon_codigo: "A 102",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Diurna",
		dia: "Martes",
		bloque_codigo: "D1",
		hora_inicio: "07:00",
		hora_fin: "10:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 2,
		estado: "confirmado",
		grupo_id: 2,
		grupo_numero: "2303A",
		materia_codigo: "MAT-AL",
		materia_nombre: "Álgebra Lineal",
		semestre: 2,
		docente_id: 2,
		docente_nombre: "P. Torres",
		docente_tipo: "TC",
		salon_codigo: "A 102",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Diurna",
		dia: "Miercoles",
		bloque_codigo: "D1",
		hora_inicio: "07:00",
		hora_fin: "10:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 3,
		estado: "confirmado",
		grupo_id: 3,
		grupo_numero: "2303A",
		materia_codigo: "MAT-PI",
		materia_nombre: "Programación I",
		semestre: 2,
		docente_id: 3,
		docente_nombre: "P. López",
		docente_tipo: "MT",
		salon_codigo: "NORTE_SALA_308",
		salon_capacidad: 18,
		sede_codigo: "NORTE",
		jornada_codigo: "Diurna",
		dia: "Miercoles",
		bloque_codigo: "D2",
		hora_inicio: "10:00",
		hora_fin: "13:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 4,
		estado: "propuesto",
		grupo_id: 4,
		grupo_numero: "2303B",
		materia_codigo: "MAT-CD",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		docente_id: 1,
		docente_nombre: "P. García",
		docente_tipo: "TC",
		salon_codigo: "A 102",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Diurna",
		dia: "Miercoles",
		bloque_codigo: "D2",
		hora_inicio: "10:00",
		hora_fin: "13:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 5,
		estado: "confirmado",
		grupo_id: 5,
		grupo_numero: "241A",
		materia_codigo: "MAT-CDN",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		docente_id: 2,
		docente_nombre: "P. Torres",
		docente_tipo: "TC",
		salon_codigo: "E-106",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Nocturna",
		dia: "Lunes",
		bloque_codigo: "N1",
		hora_inicio: "18:30",
		hora_fin: "21:30",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 6,
		estado: "confirmado",
		grupo_id: 7,
		grupo_numero: "S241E",
		materia_codigo: "MAT-CDS",
		materia_nombre: "Cálculo Diferencial",
		semestre: 2,
		docente_id: 4,
		docente_nombre: "P. Vargas",
		docente_tipo: "MT",
		salon_codigo: "P208",
		salon_capacidad: 35,
		sede_codigo: "SUR",
		jornada_codigo: "Nocturna",
		dia: "Lunes",
		bloque_codigo: "N1",
		hora_inicio: "18:30",
		hora_fin: "21:30",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 7,
		estado: "propuesto",
		grupo_id: 8,
		grupo_numero: "S241A",
		materia_codigo: "MAT-ALS",
		materia_nombre: "Álgebra Lineal",
		semestre: 2,
		docente_id: 3,
		docente_nombre: "P. López",
		docente_tipo: "MT",
		salon_codigo: "P104",
		salon_capacidad: 35,
		sede_codigo: "SUR",
		jornada_codigo: "Diurna",
		dia: "Lunes",
		bloque_codigo: "D3",
		hora_inicio: "14:00",
		hora_fin: "17:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 8,
		estado: "confirmado",
		grupo_id: 9,
		grupo_numero: "2303A",
		materia_codigo: "MAT-BD",
		materia_nombre: "Bases de Datos I",
		semestre: 4,
		docente_id: 1,
		docente_nombre: "P. García",
		docente_tipo: "TC",
		salon_codigo: "NORTE_SALA_309",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Diurna",
		dia: "Jueves",
		bloque_codigo: "D2",
		hora_inicio: "10:00",
		hora_fin: "13:00",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 9,
		estado: "confirmado",
		grupo_id: 11,
		grupo_numero: "241A",
		materia_codigo: "MAT-ISO",
		materia_nombre: "Ingeniería de Software I",
		semestre: 5,
		docente_id: 2,
		docente_nombre: "P. Torres",
		docente_tipo: "TC",
		salon_codigo: "E-104",
		salon_capacidad: 35,
		sede_codigo: "NORTE",
		jornada_codigo: "Nocturna",
		dia: "Martes",
		bloque_codigo: "N1",
		hora_inicio: "18:30",
		hora_fin: "21:30",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
	{
		id: 10,
		estado: "confirmado",
		grupo_id: 12,
		grupo_numero: "S341E",
		materia_codigo: "MAT-FI",
		materia_nombre: "Física I",
		semestre: 3,
		docente_id: 4,
		docente_nombre: "P. Vargas",
		docente_tipo: "MT",
		salon_codigo: "P209",
		salon_capacidad: 35,
		sede_codigo: "SUR",
		jornada_codigo: "Nocturna",
		dia: "Lunes",
		bloque_codigo: "N1",
		hora_inicio: "18:30",
		hora_fin: "21:30",
		programa_codigo: "IS",
		creado_en: "",
		actualizado_en: "",
	},
];

const TAG: Record<string, string> = {
	conflicto: "red",
	confirmado: "green",
	propuesto: "blue",
	cancelado: "gray",
};
const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
const BLOQUES = [
	{ codigo: "D1", hora: "07:00" },
	{ codigo: "D2", hora: "10:00" },
	{ codigo: "D3", hora: "13:00" },
	{ codigo: "N1", hora: "18:30" },
];

export default function Horarios() {
	const nav = useNavigate();
	const { data, loading, error } = useApi<Horario[]>(
		() => horariosApi.getAll() as Promise<{ data: Horario[] }>,
	);
	const horarios: Horario[] = data ?? MOCK;

	const [filEstado, setFilEstado] = useState("todos");
	const [filJornada, setFilJornada] = useState("todas");
	const [filSede, setFilSede] = useState("todas");
	const [busqueda, setBusqueda] = useState("");
	const [vista, setVista] = useState<"semana" | "tabla">("semana");

	const filtrados = useMemo(
		() =>
			horarios.filter((h) => {
				if (filEstado !== "todos" && h.estado !== filEstado)
					return false;
				if (filJornada !== "todas" && h.jornada_codigo !== filJornada)
					return false;
				if (filSede !== "todas" && h.sede_codigo !== filSede)
					return false;
				if (busqueda) {
					const q = busqueda.toLowerCase();
					return (
						h.materia_nombre.toLowerCase().includes(q) ||
						h.grupo_numero.toLowerCase().includes(q) ||
						h.docente_nombre.toLowerCase().includes(q)
					);
				}
				return true;
			}),
		[horarios, filEstado, filJornada, filSede, busqueda],
	);

	const semana = useMemo(
		() =>
			filtrados.filter(
				(h) => h.sede_codigo === "NORTE" || !h.sede_codigo,
			),
		[filtrados],
	);

	function getCelda(dia: string, bloque: string) {
		return semana.find((h) => h.dia === dia && h.bloque_codigo === bloque);
	}

	return (
		<>
			<div className="page-title">Gestión de horarios</div>
			<div className="page-sub">
				Asignación y visualización · Semestre 2025-1
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
					placeholder="Buscar materia, grupo, docente..."
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					style={{
						background: "var(--white)",
						border: "1px solid var(--border2)",
						borderRadius: "var(--r)",
						padding: "7px 12px",
						fontSize: 12,
						fontFamily: "var(--font)",
						width: 240,
						color: "var(--text)",
						outline: "none",
					}}
				/>
				<div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
					{(["semana", "tabla"] as const).map((v) => (
						<button
							key={v}
							className={`filter-chip ${vista === v ? "active" : ""}`}
							onClick={() => setVista(v)}
						>
							<i
								className={`ti ti-${v === "semana" ? "calendar" : "list"}`}
								style={{ fontSize: 12, marginRight: 3 }}
							/>
							{v === "semana" ? "Semana" : "Tabla"}
						</button>
					))}
				</div>
				<button
					className="btn-primary"
					style={{ width: "auto", padding: "6px 14px" }}
					onClick={() => nav("/ai")}
				>
					<i className="ti ti-robot" style={{ fontSize: 12 }} />{" "}
					Asignar con IA
				</button>
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
					Estado:
				</span>
				{[
					["todos", "Todos"],
					["confirmado", "Confirmado"],
					["propuesto", "Propuesto"],
					["conflicto", "Conflicto"],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filEstado === v ? "active" : ""}`}
						onClick={() => setFilEstado(v)}
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
						className={`filter-chip ${filJornada === v ? "active" : ""}`}
						onClick={() => setFilJornada(v)}
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
					Sede:
				</span>
				{[
					["todas", "Todas"],
					["NORTE", "Norte"],
					["SUR", "Sur"],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filSede === v ? "active" : ""}`}
						onClick={() => setFilSede(v)}
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
					Cargando horarios...
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

			{vista === "semana" && (
				<>
					<div className="section-header" style={{ marginBottom: 8 }}>
						<div className="section-title">
							Vista semana · Sede Norte
						</div>
						<div
							style={{
								display: "flex",
								gap: 10,
								fontSize: 11,
								color: "var(--text3)",
							}}
						>
							<span>
								<span
									style={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: 2,
										background: "#EEF2FF",
										border: "1px solid #C7D7FD",
										marginRight: 4,
									}}
								/>
								Asignado
							</span>
							<span>
								<span
									style={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: 2,
										background: "#FFF1F2",
										border: "1px solid #FCA5A5",
										marginRight: 4,
									}}
								/>
								Conflicto
							</span>
							<span>
								<span
									style={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: 2,
										background: "#F0FDF4",
										border: "1px solid #86EFAC",
										marginRight: 4,
									}}
								/>
								Libre
							</span>
						</div>
					</div>
					<div className="sch-outer">
						<div className="sch-grid">
							<div
								className="sch-head"
								style={{ background: "#F9FAFB" }}
							/>
							{DIAS.map((d) => (
								<div key={d} className="sch-head">
									{d.toUpperCase()}
								</div>
							))}
							{BLOQUES.map((b) => (
								<>
									{[
										<div
											key={`t-${b.codigo}`}
											className="sch-time"
										>
											{b.hora}
										</div>,
										...DIAS.map((dia) => {
											const h = getCelda(dia, b.codigo);
											const cls = h
												? h.estado === "conflicto"
													? "conflict"
													: "assigned"
												: "free";
											return (
												<div
													key={`${dia}-${b.codigo}`}
													className={`sch-cell ${cls}`}
												>
													{h && (
														<>
															<div className="sch-code">
																{h.grupo_numero}
															</div>
															<div className="sch-name">
																{
																	h.materia_nombre
																}
															</div>
															<div className="sch-room">
																{h.salon_codigo}
															</div>
														</>
													)}
												</div>
											);
										}),
									]}
								</>
							))}
						</div>
					</div>
				</>
			)}

			<div
				className="section-header"
				style={{ marginTop: vista === "semana" ? 16 : 0 }}
			>
				<div className="section-title">Horarios asignados</div>
				<span style={{ fontSize: 11, color: "var(--text3)" }}>
					{filtrados.length} resultados
				</span>
			</div>
			<div className="table-wrap">
				<div style={{ overflowX: "auto" }}>
					<table style={{ tableLayout: "fixed", minWidth: 680 }}>
						<thead>
							<tr>
								<th style={{ width: 88 }}>Grupo</th>
								<th>Materia</th>
								<th style={{ width: 95 }}>Docente</th>
								<th style={{ width: 88 }}>Día · Bloque</th>
								<th style={{ width: 95 }}>Salón</th>
								<th style={{ width: 55 }}>Sede</th>
								<th style={{ width: 72 }}>Jornada</th>
								<th style={{ width: 82 }}>Estado</th>
							</tr>
						</thead>
						<tbody>
							{filtrados.length === 0 ? (
								<tr>
									<td
										colSpan={8}
										style={{
											textAlign: "center",
											padding: "32px",
											color: "var(--text3)",
										}}
									>
										Sin resultados
									</td>
								</tr>
							) : (
								filtrados.map((h) => (
									<tr key={h.id}>
										<td
											className="mono"
											style={{
												fontSize: 10,
												color: "var(--blue)",
												fontWeight: 700,
											}}
										>
											{h.grupo_numero}
										</td>
										<td
											style={{
												fontWeight: 500,
												color: "var(--text)",
											}}
										>
											{h.materia_nombre}
										</td>
										<td style={{ fontSize: 11 }}>
											{h.docente_nombre}
										</td>
										<td style={{ fontSize: 11 }}>
											{h.dia} · {h.bloque_codigo}
										</td>
										<td
											className="mono"
											style={{ fontSize: 10 }}
										>
											{h.salon_codigo}
										</td>
										<td style={{ fontSize: 11 }}>
											{h.sede_codigo ?? "—"}
										</td>
										<td style={{ fontSize: 11 }}>
											{h.jornada_codigo}
										</td>
										<td>
											<span
												className={`tag tag-${TAG[h.estado] ?? "gray"}`}
											>
												{h.estado}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
