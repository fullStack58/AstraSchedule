import {
  getResumenEstado,
  getGruposSinHorario,
  asignarClase as asignarClaseService,
  proponerHorario as proponerHorarioService,
} from '../services/horarios.service.js';
import {
  getDocentesDisponibles,
  getCargaDocente,
} from '../services/docentes.service.js';
import { getAulasDisponibles } from '../services/salones.service.js';
import { detectarConflictosActivos } from '../services/conflictos.service.js';
import { getDashboardStats } from '../services/dashboard.service.js';

export const obtenerResumenEstado = getResumenEstado;
export const listarGruposSinHorario = getGruposSinHorario;
export const obtenerDocentesDisponibles = getDocentesDisponibles;

export async function obtenerCargaDocente({ docente_id }) {
  return getCargaDocente(docente_id);
}

export const obtenerAulasDisponibles = getAulasDisponibles;
export const asignarClase = asignarClaseService;
export const proponerHorario = proponerHorarioService;
export const detectarConflictos = detectarConflictosActivos;
export const generarDashboard = getDashboardStats;
