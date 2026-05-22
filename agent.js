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
            name: "obtenerResumenEstado",
            description: "Úsala cuando el usuario pida un RESUMEN, CONTEO, PORCENTAJE o ESTADO GENERAL de grupos sin horario, por ejemplo: 'cuántos grupos sin horario', 'resumen de horarios', 'porcentaje de asignación', 'estado de los grupos'. Devuelve total de grupos, porcentaje de completitud y desglose por estado (sin horario, propuesto, confirmado, conflicto).",
            parameters: {
                type: "object",
                properties: {
                    programa_id: { type: "string", description: "Código del programa (IS, IE)" },
                    jornada: { type: "string", enum: ["Diurna", "Nocturna"] },
                    sede: { type: "string", description: "Código de sede (NORTE, SUR) o null para virtual" }
                },
                required: ["programa_id", "jornada"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listarGruposSinHorario",
            description: "Úsala solo cuando el usuario pida explícitamente la LISTA DETALLADA de grupos sin horario, por ejemplo: 'lista los grupos sin horario', 'muéstrame los grupos', 'qué grupos no tienen horario'. NO la uses para preguntas de cantidad o resumen.",
            parameters: {
                type: "object",
                properties: {
                    programa_id: { type: "string" },
                    semestre: { type: "array", items: { type: "integer" } },
                    jornada: { type: "string" },
                    sede: { type: "string" }
                },
                required: ["programa_id", "semestre", "jornada"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "asignarClase",
            description: "Asigna una clase (grupo, docente, aula, franja).",
            parameters: {
                type: "object",
                properties: {
                    grupo_id: { type: "integer" },
                    docente_id: { type: "integer" },
                    aula_id: { type: "integer" },
                    dia: { type: "string", enum: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"] },
                    hora_inicio: { type: "string", pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" },
                    hora_fin: { type: "string" },
                    es_definitiva: { type: "boolean" }
                },
                required: ["grupo_id", "docente_id", "aula_id", "dia", "hora_inicio", "hora_fin"]
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
        { role: "system", content: "Eres un asistente experto en gestión académica. Para preguntas que pidan un resumen, conteo o porcentaje ('cuántos', 'resumen', 'estado'), debes usar la herramienta 'obtenerResumenEstado'. Para listados detallados, usa 'listarGruposSinHorario'. Siempre responde en español." }
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