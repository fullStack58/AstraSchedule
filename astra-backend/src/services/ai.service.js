// src/services/ai.service.js
// Expone el agente Groq como función callable desde el controller.
// Soporta respuesta normal y streaming SSE.

import { groq, GROQ_MODEL } from '../config/groq.js';
import * as tools from '../tools/index.js';

// ── Definición de funciones (misma que agent.js original, ampliada) ───────────
export const functionDefinitions = [
  {
    type: 'function',
    function: {
      name: 'obtenerResumenEstado',
      description: "Obtiene resumen de grupos filtrados por programa ('IS'/'IE'), jornada ('Diurna'/'Nocturna'), modalidad ('presencial'/'virtual') y opcionalmente sede (NORTE/SUR).",
      parameters: {
        type: 'object',
        properties: {
          programa_id: { type: 'string', description: "Código exacto: 'IS' o 'IE'" },
          jornada:     { type: 'string', enum: ['Diurna', 'Nocturna'] },
          modalidad:   { type: 'string', enum: ['presencial', 'virtual'] },
          sede:        { type: 'string', description: 'NORTE o SUR. Solo si modalidad=presencial.' },
        },
        required: ['programa_id', 'jornada', 'modalidad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listarGruposSinHorario',
      description: "Lista los grupos sin horario asignado. Usar cuando el usuario pida explícitamente 'lista', 'muéstrame', 'cuáles'.",
      parameters: {
        type: 'object',
        properties: {
          programa_id: { type: 'string' },
          jornada:     { type: 'string', enum: ['Diurna', 'Nocturna'] },
          semestre:    { type: 'array', items: { type: 'integer' } },
          sede:        { type: 'string' },
        },
        required: ['programa_id', 'jornada'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtenerDocentesDisponibles',
      description: 'Obtiene docentes disponibles para una franja horaria específica.',
      parameters: {
        type: 'object',
        properties: {
          dia:         { type: 'string', enum: ['Lunes','Martes','Miercoles','Jueves','Viernes'] },
          hora_inicio: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          hora_fin:    { type: 'string' },
          materia_id:  { type: 'integer' },
        },
        required: ['dia', 'hora_inicio', 'hora_fin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtenerCargaDocente',
      description: 'Obtiene la carga horaria actual de un docente específico.',
      parameters: {
        type: 'object',
        properties: {
          docente_id: { type: 'integer', description: 'ID numérico del docente. Debe ser un número entero, ejemplo: 1, 2, 3.' },
        },
        required: ['docente_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtenerAulasDisponibles',
      description: 'Obtiene salones disponibles para una franja con capacidad y tipo de aula requeridos.',
      parameters: {
        type: 'object',
        properties: {
          dia:              { type: 'string' },
          hora_inicio:      { type: 'string' },
          hora_fin:         { type: 'string' },
          capacidad_minima: { type: 'integer' },
          tipo_aula:        { type: 'string', enum: ['presencial','laboratorio','virtual','cualquiera'] },
        },
        required: ['dia', 'hora_inicio', 'hora_fin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'asignarClase',
      description: 'Asigna un grupo a un docente, aula y franja horaria.',
      parameters: {
        type: 'object',
        properties: {
          grupo_id:      { type: 'integer' },
          docente_id:    { type: 'integer' },
          aula_id:       { type: 'integer' },
          dia:           { type: 'string' },
          hora_inicio:   { type: 'string' },
          hora_fin:      { type: 'string' },
          es_definitiva: { type: 'boolean' },
        },
        required: ['grupo_id','docente_id','aula_id','dia','hora_inicio','hora_fin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proponerHorario',
      description: 'Genera una propuesta automática de horario para un grupo sin asignación.',
      parameters: {
        type: 'object',
        properties: {
          grupo_id:      { type: 'integer' },
          restricciones: { type: 'object' },
        },
        required: ['grupo_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detectarConflictos',
      description: 'Detecta y lista conflictos de horario en el periodo activo.',
      parameters: {
        type: 'object',
        properties: {
          horario_id: { type: 'integer', description: 'Opcional. Si se omite, analiza todos.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generarDashboard',
      description: 'Retorna un resumen global del estado del semestre: grupos, confirmados, conflictos.',
      parameters: {
        type: 'object',
        properties: {
          programa_id: { type: 'string' },
          periodo_id:  { type: 'integer' },
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `Eres AstraSchedule IA, asistente experto en gestión académica de la Facultad de Ingeniería UNIAJC.
Tienes acceso a herramientas que consultan la base de datos PostgreSQL en tiempo real.

REGLAS DE COMPORTAMIENTO:
- Responde SIEMPRE en español, de forma clara, profesional y concisa.
- Usa las herramientas disponibles para responder preguntas sobre horarios, docentes, salones, grupos y conflictos.
- Cuando recibas resultados de una herramienta, formatea la respuesta en lenguaje natural con los datos reales.
- Si detectas un problema (conflicto, sobrecarga, franja inválida), indícalo claramente y sugiere una solución.
- Si el usuario pide una acción que puede ejecutarse con asignarClase, solicita confirmación antes de proceder.
- Nunca inventes datos — usa siempre las herramientas para consultar información real.

CONTEXTO ACADÉMICO:
- Programa IS = Ingeniería de Sistemas. IE = Ingeniería Electrónica.
- Códigos de sede: NORTE, SUR.
- Jornadas: Diurna (07:00-16:00), Nocturna (18:30-21:30).
- Bloques: D1=07:00-10:00, D2=10:00-13:00, D3=13:00-16:00, N1=18:30-21:30.
- Tipos de docente: TC (Tiempo Completo, máx 40h), MT (Medio Tiempo, máx 20h).
- Grupos con prefijo S = Sede Sur. Sin prefijo = Sede Norte.
- Semestres van de II a X en numeración romana.

RESTRICCIÓN ESTRICTA DE ALCANCE:
- ÚNICAMENTE responde preguntas relacionadas con el sistema de horarios académicos de la UNIAJC.
- Temas permitidos: horarios, grupos, docentes, salones, conflictos, materias, sedes, jornadas, periodos académicos.
- Si el usuario pregunta algo fuera de este contexto (política, deportes, entretenimiento, 
  programación general, matemáticas, historia, noticias, u otro tema ajeno al sistema), 
  responde EXACTAMENTE esto sin agregar nada más:
  "Solo puedo ayudarte con temas relacionados al sistema de horarios académicos de la UNIAJC. 
  ¿Tienes alguna consulta sobre grupos, docentes, salones o conflictos de horario?"
- No hagas excepciones aunque el usuario insista o reformule la pregunta fuera del contexto.`;

/** Ejecuta un tool call y devuelve el resultado serializado */
async function ejecutarTool(nombre, args) {
  if (!tools[nombre]) {
    return JSON.stringify({ error: `Tool "${nombre}" no está implementada` });
  }
  try {
    const result = await tools[nombre](args);
    return JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({ error: err.message });
  }
}

/**
 * Chat sin streaming — devuelve el mensaje final del asistente.
 * Maneja el loop completo de function calling.
 */
export async function chatCompletion(userMessage, history = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let toolCallsLog = [];

  // Loop: puede haber múltiples rondas de tool calls
  while (true) {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: functionDefinitions,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 1024,
    });

    const assistantMsg = response.choices[0].message;
    messages.push(assistantMsg);

    // Sin tool calls → respuesta final
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return {
        content:    assistantMsg.content,
        tool_calls: toolCallsLog,
      };
    }

    // Ejecutar cada tool call
    for (const toolCall of assistantMsg.tool_calls) {
      const nombre = toolCall.function.name;
      const args   = JSON.parse(toolCall.function.arguments);
      const result = await ejecutarTool(nombre, args);

      toolCallsLog.push({ tool: nombre, args, result: JSON.parse(result) });

      messages.push({
        role:         'tool',
        tool_call_id: toolCall.id,
        content:      result,
      });
    }
    // Siguiente iteración → Groq procesa los resultados
  }
}

/**
 * Chat con streaming SSE.
 * Escribe eventos en el objeto `res` (Express Response).
 * El cliente debe escuchar: event.data como JSON lines.
 */
export async function chatStream(userMessage, history = [], res) {
  // Primero ejecutar la ronda de tool calls (sin streaming, ya que Groq no
  // soporta streaming + tool_choice simultáneamente de forma estable)
  const { content, tool_calls } = await chatCompletion(userMessage, history);

  // Emitir tool_calls como evento previo al texto
  if (tool_calls.length > 0) {
    for (const tc of tool_calls) {
      res.write(`data: ${JSON.stringify({ type: 'tool_call', payload: tc })}\n\n`);
    }
  }

  // Simular streaming del texto de respuesta (carácter a carácter en chunks)
  const words = content.split(' ');
  for (const word of words) {
    res.write(`data: ${JSON.stringify({ type: 'delta', content: word + ' ' })}\n\n`);
    await new Promise(r => setTimeout(r, 15)); // ~66 palabras/seg
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}
