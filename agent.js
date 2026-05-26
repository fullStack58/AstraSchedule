// agent.js
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import readline from 'readline';
import * as tools from './tools/index.js';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Groq recomienda usar modelos como 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'
const MODEL = 'llama-3.3-70b-versatile'; // o 'mixtral-8x7b-32768', 'llama3-70b-8192'

// Definición de funciones (igual que en OpenAI, Groq es compatible con Function Calling)
const functionDefinitions = [
    {
        type: "function",
        function: {
            name: "obtener_resumen_estado",
            description: "Obtiene un resumen de grupos filtrados por programa (usar 'IS' o 'IE'), jornada ('Diurna'/'Nocturna'), modalidad ('presencial'/'virtual') y opcionalmente sede (solo para presencial). Ejemplo: programa_id='IS', jornada='Diurna', modalidad='virtual'.",
            parameters: {
                type: "object",
                properties: {
                    programa_id: { type: "string", description: "Código del programa académico. Debe ser exactamente 'IS' para Ingeniería de Sistemas o 'IE' para Ingeniería Electrónica. No uses el nombre completo." },
                    jornada: { type: "string", enum: ["Diurna", "Nocturna"] },
                    modalidad: { type: "string", enum: ["presencial", "virtual"] },
                    sede: { type: "string", description: "Opcional. Código de sede (NORTE, SUR). Solo si modalidad es presencial." }
                },
                required: ["programa_id", "jornada", "modalidad"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listar_grupos_sin_horario",
            description: "Lista los grupos que aún no tienen horario. Úsala cuando el usuario pida explícitamente una lista. El parámetro 'semestre' debe ser un array de números enteros (ej. [1,2,3,4,5,6,7,8,9,10]). Si el usuario no especifica semestres, usa [1,2,3,4,5,6,7,8,9,10] (todos los semestres). No uses años ni números grandes.",
            parameters: {
                type: "object",
                properties: {
                    programa_id: { type: "string" },
                    jornada: { type: "string", enum: ["Diurna", "Nocturna"] },
                    modalidad: { type: "string", enum: ["presencial", "virtual"] },
                    sede: { type: "string", description: "Opcional. Solo para presencial." },
                    semestre: {
                        type: "array",
                        items: { type: "integer" },
                        description: "Lista de semestres. Por defecto [1,2,3,4,5,6,7,8,9,10]."
                    }
                },
                required: ["programa_id", "jornada", "modalidad"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generar_horarios_pendientes",
            description: "Genera horarios automáticamente para todos los grupos sin horario que cumplan los criterios (programa, jornada, modalidad, sede). Evalúa fusiones de grupos de diferentes programas con misma materia y jornada.",
            parameters: {
                type: "object",
                properties: {
                    programa_id: { type: "string", description: "Código del programa (IS o IE)" },
                    jornada: { type: "string", enum: ["Diurna", "Nocturna"] },
                    modalidad: { type: "string", enum: ["presencial", "virtual"] },
                    sede: { type: "string", description: "Código de sede (NORTE, SUR). Obligatorio si modalidad=presencial." }
                },
                required: ["programa_id", "jornada", "modalidad"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "asignar_clase",
            description: "Asigna una clase a un grupo, docente, aula y franja horaria específica.",
            parameters: {
                type: "object",
                properties: {
                    grupo_id: { type: "integer" },
                    docente_id: { type: "integer" },
                    aula_id: { type: "integer" },
                    franja_id: { type: "integer", description: "ID de la franja horaria (obtenido de proponer_horario o de listar franjas)." },
                    es_definitiva: { type: "boolean", description: "Si es true, el estado queda confirmado; si false, queda propuesto." }
                },
                required: ["grupo_id", "docente_id", "aula_id", "franja_id"]
            }

        }
    },
    // Agrega aquí el resto de las funciones (proponerHorario, detectarConflictos, etc.)
];

async function ejecutarTool(nombre, args) {
    if (!tools[nombre]) throw new Error(`Tool "${nombre}" no implementada`);
    return await tools[nombre](args);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function iniciarAgente() {
    console.log("🤖 Agente UNIAJC - Optimización de Horarios (Groq)\nEscribe 'salir' para terminar.\n");
    const messages = [
        {
            role: "system",
            content: `Eres un asistente experto en gestión académica. Para responder a preguntas sobre resúmenes de horarios, debes usar la herramienta 'obtenerResumenEstado'.

            Cuando recibas el resultado de esa herramienta (un JSON con los campos total_grupos, porcentaje_completitud, por_estado, programa_id, jornada, modalidad y sede), SIEMPRE debes formatear tu respuesta de la siguiente manera, usando lenguaje natural:

            "Según el resumen, hay [total_grupos] grupos [modalidad] en total en [programa] (jornada [jornada], sede [sede]). De ellos, [sin_horario] aún no tienen horario asignado ([porcentaje_completitud]% completado). Desglose:
            - Sin horario: [sin_horario] grupos
            - Propuesto: [propuesto] grupos
            - Confirmado: [confirmado] grupos
            - Conflicto: [conflicto] grupos"

            Luego, debes agregar una pregunta adicional según el caso:
            - Si sin_horario > 0, pregunta de forma natural: "¿Deseas que genere los horarios para los [sin_horario] grupos pendientes?"
            - Si sin_horario === 0, pregunta: "¿Hay algo más en lo que pueda ayudarte? Por ejemplo, listar grupos, asignar una clase, consultar disponibilidad de docentes, etc."

            **Importante**: Si el usuario responde afirmativamente (por ejemplo, "sí", "sí, por favor", "adelante", "genera los horarios") después de que le hayas preguntado "¿Deseas que genere los horarios...?", entonces debes invocar la herramienta 'generarHorariosPendientes' con los mismos parámetros (programa_id, jornada, modalidad, sede) que usaste en 'obtenerResumenEstado'. No pidas confirmación adicional.

            Sustituye los valores entre corchetes por los datos reales del JSON. Siempre responde en español, de manera amable, clara y profesional.
            
            Si el usuario pide explícitamente "muéstrame los horarios", "lista los horarios asignados", "qué horarios se han generado", debes usar la herramienta 'listar_horarios_asignados'. Puedes filtrar por estado ('propuesto', 'confirmado', 'conflicto', 'todos'). Si no se especifica estado, asume 'propuesto'.
            
            Para 'listar_grupos_sin_horario': cuando recibas el resultado (array de objetos), debes presentar una lista enumerada (1., 2., 3., ...). Cada elemento debe incluir:
            - Código de materia, nombre de materia y número de grupo (ej. "IS-101 - Lógica y Razonamiento, grupo A").
            - Luego, en líneas aparte con viñetas (-), muestra la siguiente información (solo la que esté disponible):
            - Cupo máximo: [cupo_max]
            - Modalidad: [presencial o virtual]
            - Sede: [código de sede o 'virtual']

            Ejemplo de formato esperado (para grupo presencial):
            1. IS-101 - Lógica y Razonamiento, grupo A: 
            - Cupo máximo: 30
            - Modalidad: presencial
            - Sede: NORTE

            2. IS-102 - Matemáticas Básica, grupo A: 
            - Cupo máximo: 30
            - Modalidad: presencial
            - Sede: NORTE

            Si la lista está vacía, indica que no hay grupos sin horario con esos criterios.

            Para 'listar_horarios_asignados': cuando recibas el resultado (array de objetos), debes presentar una lista enumerada (1., 2., 3., ...). Cada elemento debe incluir:
            - Código de materia, nombre de materia y grupo (ej. "IS-101 - Lógica y Razonamiento, grupo A").
            - Luego, en líneas aparte con viñetas (-), muestra:
            - Docente: [nombre del docente]
            - Salón: [código del salón]
            - Día: [día de la semana]
            - Hora: [hora_inicio - hora_fin]
            - Estado: [propuesto, confirmado, conflicto]

            Ejemplo de formato esperado:
            1. IS-101 - Lógica y Razonamiento, grupo A: 
            - Docente: Felipe Vasco
            - Salón: N-001
            - Día: Lunes
            - Hora: 07:00-10:00
            - Estado: Propuesto
            2. IS-102 - Matemáticas Básica, grupo A: 
            - Docente: Lucía Restrepo
            - Salón: N-001
            - Día: Martes
            - Hora: 07:00-10:00
            - Estado: Propuesto
            ...
            No uses otros formatos. Si la lista está vacía, indica que no hay horarios asignados con ese filtro.
            `
        }
    ];

    const pregunta = () => {
        rl.question("> ", async (input) => {
            if (input.toLowerCase() === "salir") {
                console.log("👋 Hasta luego.");
                rl.close();
                return;
            }
            messages.push({ role: "user", content: input });

            try {
                const response = await groq.chat.completions.create({
                    model: MODEL,
                    messages: messages,
                    tools: functionDefinitions,
                    tool_choice: "auto",
                    temperature: 0.3
                });

                const assistantMessage = response.choices[0].message;
                messages.push(assistantMessage);

                if (assistantMessage.tool_calls) {
                    for (const toolCall of assistantMessage.tool_calls) {
                        const funcName = toolCall.function.name;
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log(`🔧 Llamando a tool: ${funcName} con args:`, args);
                        const result = await ejecutarTool(funcName, args);
                        messages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result)
                        });
                    }
                    // Segunda llamada para obtener respuesta final
                    const finalResp = await groq.chat.completions.create({
                        model: MODEL,
                        messages: messages,
                        temperature: 0.3
                    });
                    const finalMsg = finalResp.choices[0].message.content;
                    console.log("\n🤖 Respuesta:\n", finalMsg);
                    messages.push({ role: "assistant", content: finalMsg });
                } else {
                    console.log("\n🤖:", assistantMessage.content);
                }
            } catch (error) {
                console.error("❌ Error:", error.message);
            }
            pregunta();
        });
    };
    pregunta();
}

import { pool } from './scripts/db.js';
pool.connect().then(() => {
    console.log("✅ Conectado a PostgreSQL");
    iniciarAgente();
}).catch(err => {
    console.error("❌ Error de base de datos:", err.message);
    process.exit(1);
});