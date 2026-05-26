// src/types/schema.ts

export type Jornada    = 'Diurna' | 'Nocturna';
export type Modalidad  = 'presencial' | 'virtual';
export type TipoAula   = 'presencial' | 'laboratorio' | 'virtual' | 'cualquiera';
export type TipoDocente = 'TC' | 'MT';
export type EstadoHorario  = 'propuesto' | 'confirmado' | 'conflicto' | 'cancelado';
export type EstadoGrupo    = 'abierto' | 'cerrado' | 'cancelado';
export type TipoConflicto  =
  | 'aula_solapada' | 'docente_solapado' | 'estudiante_solapado'
  | 'capacidad_excedida' | 'aula_incompatible' | 'docente_no_disponible'
  | 'carga_docente_excedida' | 'prerequisito_no_cumplido' | 'sin_paz_y_salvo'
  | 'jornada_incompatible' | 'sede_estudiante_incompatible' | 'traslado_sede_docente'
  | 'modalidad_virtual_requerida' | 'grupo_c_sin_autorizacion';

export interface Sede {
  id: number;
  codigo: string;
  nombre: string;
  direccion?: string;
}

export interface Programa {
  id: number;
  codigo: string;
  nombre: string;
  total_semestres: number;
}

export interface Materia {
  id: number;
  codigo: string;
  nombre: string;
  programa_id: number;
  programa_codigo?: string;
  semestre: number;
  creditos: number;
  horas_semana: number;
  tipo_aula_requerida: TipoAula;
  activa: boolean;
  prerequisitos?: Array<{ id: number; codigo: string; nombre: string }>;
}

export interface Docente {
  id: number;
  identificacion: string;
  nombre: string;
  email: string;
  tipo: TipoDocente;
  carga_max_horas: number;
  disponibilidad: Jornada | 'Ambas';
  activo: boolean;
  horas_asignadas?: number;
  horas_disponibles?: number;
}

export interface Salon {
  id: number;
  codigo: string;
  sede_id: number;
  sede_codigo?: string;
  tipo: 'presencial' | 'laboratorio' | 'virtual';
  capacidad: number;
  bloque?: string;
  disponible: boolean;
}

export interface Grupo {
  id: number;
  numero: string;
  cupo_max: number;
  modalidad: Modalidad;
  estado: EstadoGrupo;
  materia_codigo: string;
  materia_nombre: string;
  semestre: number;
  programa_codigo: string;
  jornada_codigo: Jornada;
  sede_codigo?: string;
  periodo_codigo: string;
  inscripciones_activas?: number;
  horario_id?: number;
  horario_estado?: EstadoHorario;
}

export interface Horario {
  id: number;
  estado: EstadoHorario;
  grupo_id: number;
  grupo_numero: string;
  materia_codigo: string;
  materia_nombre: string;
  semestre: number;
  docente_id: number;
  docente_nombre: string;
  docente_tipo: TipoDocente;
  salon_codigo: string;
  salon_capacidad: number;
  sede_codigo?: string;
  jornada_codigo: Jornada;
  dia: string;
  bloque_codigo: string;
  hora_inicio: string;
  hora_fin: string;
  programa_codigo: string;
  creado_en: string;
  actualizado_en: string;
}

export interface Conflicto {
  id: number;
  tipo: TipoConflicto;
  descripcion: string;
  horario_id?: number;
  resuelto: boolean;
  detectado_en: string;
  grupo_numero?: string;
  materia_nombre?: string;
  docente_nombre?: string;
  salon_codigo?: string;
}

export interface DashboardStats {
  total_grupos: number;
  grupos_con_horario: number;
  horarios_confirmados: number;
  conflictos_activos: number;
  docentes_activos: number;
  salones_disponibles: number;
  estudiantes_activos: number;
  periodo_activo: string;
  porcentaje_completitud: number;
}

export interface EstadoPrograma {
  codigo: string;
  nombre: string;
  total_grupos: number;
  con_horario: number;
  sin_horario: number;
  porcentaje: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  count?: number;
  error?: { code: string; message: string; details?: unknown };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: Array<{ tool: string; args: unknown; result: unknown }>;
}
