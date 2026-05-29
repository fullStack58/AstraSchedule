import {
  obtener_resumen_estado,
  listar_grupos_sin_horario,
  obtener_aulas_disponibles,
  asignar_clase,
  proponer_horario,
  generar_horarios_pendientes,
} from "../../../tools/index.js";

export const obtenerResumenEstado        = obtener_resumen_estado;
export const listarGruposSinHorario      = listar_grupos_sin_horario;
export const obtenerAulasDisponibles     = obtener_aulas_disponibles;
export const asignarClase                = asignar_clase;
export const proponerHorario             = proponer_horario;
export const detectarConflictos          = generar_horarios_pendientes;
export const generarDashboard            = generar_horarios_pendientes;