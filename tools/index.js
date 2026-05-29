// Consulta
export { obtener_resumen_estado } from './consulta/obtener_resumen_estado.js';
export { listar_grupos_sin_horario } from './consulta/listar_grupos_sin_horario.js';
export { listar_horarios_asignados } from './consulta/listar_horarios_asignados.js';
export { obtener_aulas_disponibles } from './consulta/obtener_aulas_disponibles.js';
// Generación
export { evaluar_fusion_grupos } from './generacion/evaluar_fusion_grupos.js';
export { proponer_horario } from './generacion/proponer_horario.js';
export { asignar_clase } from './generacion/asignar_clase.js';
export { generar_horarios_pendientes } from './generacion/generar_horarios_pendientes.js';
export { detectar_conflictos } from './generacion/detectar_conflictos.js';
// Notificaciones
export { notificar_docente } from './notificaciones/notificar_docente.js';
export { notificar_director } from './notificaciones/notificar_director.js';
// Gestión 
export { enviar_formato_prematricula } from './gestion/enviar_formato_prematricula.js';
export { procesar_respuesta_director_prematricula } from './gestion/procesar_respuesta_director_prematricula.js';
export { aprobar_prematricula } from './gestion/aprobar_prematricula.js';
export { enviar_solicitud_matricula } from './gestion/enviar_solicitud_matricula.js';
export { procesar_contrapropuesta_docente } from './gestion/procesar_contrapropuesta_docente.js';
export { generar_alternativa_negociacion } from './gestion/generar_alternativa_negociacion.js';
export { bloquear_horario_definitivo } from './gestion/bloquear_horario_definitivo.js';
// Reportes 
export { generar_reporte_horario } from './reportes/generar_reporte_horario.js';