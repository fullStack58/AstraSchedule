// src/services/api.ts
import type { ApiResponse } from "../types/schema";

const BASE = "/api";

async function request<T>(
	path: string,
	options?: RequestInit,
): Promise<ApiResponse<T>> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { "Content-Type": "application/json", ...options?.headers },
		...options,
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
	return json as ApiResponse<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
	request<T>(path, { method: "POST", body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
	request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

// ── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardApi = {
	getStats: () => get("/dashboard"),
	getSemana: (sede?: string, jornada?: string) =>
		get(
			`/dashboard/semana?${new URLSearchParams({ ...(sede && { sede_codigo: sede }), ...(jornada && { jornada_codigo: jornada }) })}`,
		),
};

// ── Horarios ───────────────────────────────────────────────────────────────
export const horariosApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/horarios?${new URLSearchParams(params)}`),
	getById: (id: number) => get(`/horarios/${id}`),
	getResumen: (p: {
		programa_id: string;
		jornada: string;
		modalidad: string;
		sede?: string;
	}) =>
		get(
			`/horarios/resumen?${new URLSearchParams(p as Record<string, string>)}`,
		),
	getSinHorario: (p: Record<string, string>) =>
		get(`/horarios/sin-horario?${new URLSearchParams(p)}`),
	proponer: (body: { grupo_id: number; restricciones?: unknown }) =>
		post("/horarios/proponer", body),
	asignar: (body: unknown) => post("/horarios/asignar", body),
	cambiarEstado: (id: number, body: unknown) =>
		patch(`/horarios/${id}/estado`, body),
	contrapropuesta: (id: number, body: unknown) =>
		post(`/horarios/${id}/contrapropuesta`, body),
	getReporte: (grupo_id: number) => get(`/horarios/reporte/${grupo_id}`),
};

// ── Docentes ───────────────────────────────────────────────────────────────
export const docentesApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/docentes?${new URLSearchParams(params)}`),
	getById: (id: number) => get(`/docentes/${id}`),
	getCarga: (id: number) => get(`/docentes/${id}/carga`),
	getDisponibilidad: (id: number) => get(`/docentes/${id}/disponibilidad`),
	getSobrecarga: () => get("/docentes/sobrecarga"),
	getDisponibles: (dia: string, hora_inicio: string, hora_fin: string) =>
		get(
			`/docentes/disponibles?dia=${dia}&hora_inicio=${hora_inicio}&hora_fin=${hora_fin}`,
		),
};

// ── Salones ────────────────────────────────────────────────────────────────
export const salonesApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/salones?${new URLSearchParams(params)}`),
	getDisponibles: (p: Record<string, string>) =>
		get(`/salones/disponibles?${new URLSearchParams(p)}`),
	getOcupacion: () => get("/salones/ocupacion"),
};

// ── Grupos / Materias ──────────────────────────────────────────────────────
export const gruposApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/grupos?${new URLSearchParams(params)}`),
	getById: (id: number) => get(`/grupos/${id}`),
};
export const materiasApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/materias?${new URLSearchParams(params)}`),
};

// ── Conflictos ─────────────────────────────────────────────────────────────
export const conflictosApi = {
	getAll: (params?: Record<string, string>) =>
		get(`/conflictos?${new URLSearchParams(params)}`),
	getResumen: () => get("/conflictos/resumen"),
	detectar: () => get("/conflictos/detectar"),
	resolver: (id: number) => patch(`/conflictos/${id}/resolver`, {}),
};

// ── AI ─────────────────────────────────────────────────────────────────────
export const aiApi = {
	chat: (message: string, history: unknown[]) =>
		post("/ai/chat", { message, history, stream: false }),
};
