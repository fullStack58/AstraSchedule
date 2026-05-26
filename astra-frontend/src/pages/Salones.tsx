// src/pages/Salones.tsx
import { useState, useMemo } from "react";
import { salonesApi } from "../services/api";
import { useApi } from "../hooks/useApi";
import { StatCard } from "../components/atoms/index";
import type { Salon } from "../types/schema";

const MOCK: Salon[] = [
	{
		id: 1,
		codigo: "A 102",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 2,
		codigo: "A 103",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 3,
		codigo: "A 109",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: false,
	},
	{
		id: 4,
		codigo: "NORTE_SALA_308",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: false,
	},
	{
		id: 5,
		codigo: "NORTE_SALA_307",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: true,
	},
	{
		id: 6,
		codigo: "NORTE_SALA_309",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: true,
	},
	{
		id: 7,
		codigo: "NORTE_SALA_312",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: false,
	},
	{
		id: 8,
		codigo: "E-106",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: false,
	},
	{
		id: 9,
		codigo: "E-104",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 10,
		codigo: "ADM-204",
		sede_id: 1,
		sede_codigo: "NORTE",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 11,
		codigo: "P208",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: false,
	},
	{
		id: 12,
		codigo: "P209",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 13,
		codigo: "P106",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 14,
		codigo: "P202",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: false,
	},
	{
		id: 15,
		codigo: "102S",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: true,
	},
	{
		id: 16,
		codigo: "107S",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "laboratorio",
		capacidad: 18,
		disponible: false,
	},
	{
		id: 17,
		codigo: "AL104",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "laboratorio",
		capacidad: 25,
		disponible: true,
	},
	{
		id: 18,
		codigo: "P104",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: false,
	},
	{
		id: 19,
		codigo: "P102",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
	{
		id: 20,
		codigo: "P101",
		sede_id: 2,
		sede_codigo: "SUR",
		tipo: "presencial",
		capacidad: 35,
		disponible: true,
	},
];

export default function Salones() {
	const { data, loading, error } = useApi<Salon[]>(
		() => salonesApi.getAll() as Promise<{ data: Salon[] }>,
	);
	const salones: Salon[] = data ?? MOCK;

	const [filtroSede, setFiltroSede] = useState("todas");
	const [filtroTipo, setFiltroTipo] = useState("todos");
	const [filtroDisp, setFiltroDisp] = useState("todos");
	const [busqueda, setBusqueda] = useState("");

	const filtrados = useMemo(
		() =>
			salones.filter((s) => {
				if (filtroSede !== "todas" && s.sede_codigo !== filtroSede)
					return false;
				if (filtroTipo !== "todos" && s.tipo !== filtroTipo)
					return false;
				if (filtroDisp === "libre" && !s.disponible) return false;
				if (filtroDisp === "ocupado" && s.disponible) return false;
				if (
					busqueda &&
					!s.codigo.toLowerCase().includes(busqueda.toLowerCase())
				)
					return false;
				return true;
			}),
		[salones, filtroSede, filtroTipo, filtroDisp, busqueda],
	);

	const cntNorte = salones.filter((s) => s.sede_codigo === "NORTE").length;
	const cntSur = salones.filter((s) => s.sede_codigo === "SUR").length;
	const cntOcup = salones.filter((s) => !s.disponible).length;
	const cntLibre = salones.filter((s) => s.disponible).length;
	const cntLab = salones.filter((s) => s.tipo === "laboratorio").length;

	return (
		<>
			<div className="page-title">Salones</div>
			<div className="page-sub">
				Ocupación y disponibilidad en tiempo real
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
				<StatCard label="Total" value={salones.length} />
				<StatCard
					label="Ocupados"
					value={cntOcup}
					sub="En uso ahora"
					subVariant="down"
				/>
				<StatCard
					label="Disponibles"
					value={cntLibre}
					sub="Libres"
					subVariant="up"
				/>
				<StatCard label="Laboratorios" value={cntLab} />
			</div>

			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 12,
					alignItems: "center",
				}}
			>
				<input
					placeholder="Buscar salón..."
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					style={{
						background: "var(--white)",
						border: "1px solid var(--border2)",
						borderRadius: "var(--r)",
						padding: "7px 12px",
						fontSize: 12,
						fontFamily: "var(--font)",
						width: 200,
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
					Sede:
				</span>
				{[
					["todas", `Todas (${salones.length})`],
					["NORTE", `Norte (${cntNorte})`],
					["SUR", `Sur (${cntSur})`],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filtroSede === v ? "active" : ""}`}
						onClick={() => setFiltroSede(v)}
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
					Tipo:
				</span>
				{[
					["todos", "Todos"],
					["presencial", "Aula"],
					["laboratorio", `Lab (${cntLab})`],
					["virtual", "Virtual"],
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
					Estado:
				</span>
				{[
					["todos", "Todos"],
					["libre", `Libre (${cntLibre})`],
					["ocupado", `Ocupado (${cntOcup})`],
				].map(([v, l]) => (
					<button
						key={v}
						className={`filter-chip ${filtroDisp === v ? "active" : ""}`}
						onClick={() => setFiltroDisp(v)}
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
					Cargando salones...
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

			<div
				style={{ marginBottom: 8, fontSize: 11, color: "var(--text3)" }}
			>
				Mostrando{" "}
				<strong style={{ color: "var(--text)" }}>
					{filtrados.length}
				</strong>{" "}
				de {salones.length} salones
			</div>

			<div
				className="rooms-grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
				}}
			>
				{filtrados.length === 0 ? (
					<div
						style={{
							gridColumn: "1/-1",
							padding: "32px",
							textAlign: "center",
							color: "var(--text3)",
						}}
					>
						Sin resultados
					</div>
				) : (
					filtrados.map((s) => (
						<div
							key={s.id}
							className={`room-card ${s.disponible ? "free" : "occ"}`}
						>
							<div
								className={
									s.disponible
										? "room-code-free"
										: "room-code-occ"
								}
							>
								{s.codigo}
							</div>
							<div className="room-info">
								{s.tipo === "laboratorio"
									? "Laboratorio"
									: s.tipo === "virtual"
										? "Virtual"
										: "Aula"}{" "}
								· {s.capacidad} cupos
							</div>
							<div className="room-info" style={{ marginTop: 2 }}>
								{s.sede_codigo}
							</div>
							<div
								style={{
									marginTop: 4,
									fontSize: 10,
									fontWeight: 600,
									color: s.disponible
										? "var(--green-txt)"
										: "var(--red-txt)",
								}}
							>
								{s.disponible ? "Disponible" : "Ocupado"}
							</div>
						</div>
					))
				)}
			</div>
		</>
	);
}
