// list-models.js
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data.models) {
            console.log("📋 Modelos disponibles (con generateContent):");
            data.models.forEach(model => {
                if (model.supportedGenerationMethods?.includes('generateContent')) {
                    console.log(`  - ${model.name}`);
                }
            });
        } else {
            console.error("Error:", data.error?.message || "No se pudo obtener la lista");
        }
    } catch (error) {
        console.error("Error de red:", error.message);
    }
}

listModels();