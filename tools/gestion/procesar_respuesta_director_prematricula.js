/**
 * Procesa y registra la decisión del director sobre una prematrícula.
 * @param {Object} args
 * @param {number|string} args.solicitud_id - Recuerda que equivale al estudiante_id
 * @param {string} args.respuesta - Ej: 'Aprobado', 'Rechazado', 'Con ajustes'
 * @param {string} args.observaciones_director 
 * @param {string} args.ajustes_horario - Detalles si la respuesta requiere cambios
 */
export async function procesar_respuesta_director_prematricula({
  solicitud_id,
  respuesta,
  observaciones_director,
  ajustes_horario
}) {
  
  if (!solicitud_id || !respuesta) {
    return JSON.stringify({
      success: false,
      error: 'Se requiere el solicitud_id (estudiante_id) y la respuesta del director.'
    });
  }

  // Al no haber una tabla de "solicitudes" como tal, esta tool sirve para
  // recibir la confirmación del LLM y retornarle un estado lógico. 
  // El LLM usará esto para saber si debe llamar a 'aprobar_prematricula' a continuación.
  
  const estadoProcesado = {
    solicitud_id: solicitud_id,
    decision: respuesta,
    observaciones: observaciones_director || 'Sin observaciones adicionales.',
    requiere_cambios: respuesta.toLowerCase().includes('ajuste') || respuesta.toLowerCase().includes('rechazado'),
    ajustes_sugeridos: ajustes_horario || null
  };

  return JSON.stringify({
    success: true,
    mensaje: `La respuesta del director ha sido procesada. Decisión: ${respuesta}.`,
    detalles: estadoProcesado
  });
}