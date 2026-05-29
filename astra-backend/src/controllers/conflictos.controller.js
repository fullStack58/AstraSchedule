import {
  analizarCargaExcedida,
  analizarPrerequisitos,
  obtenerAuditoria,
} from "../services/conflictos.service.js";

export async function detectarCarga(req, res) {
  try {
    const resultado = await analizarCargaExcedida();

    res.json({
      ok: true,
      tipo: "carga_docente_excedida",
      cantidad: resultado.length,
      conflictos: resultado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error detectando carga excedida",
      error: error.message,
    });
  }
}

export async function detectarPrerequisitosController(req, res) {
  try {
    const resultado = await analizarPrerequisitos();

    res.json({
      ok: true,
      tipo: "prerequisito_no_cumplido",
      cantidad: resultado.length,
      conflictos: resultado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error detectando prerrequisitos",
      error: error.message,
    });
  }
}

export async function listarAuditoria(req, res) {
  try {
    const conflictos = await obtenerAuditoria();

    res.json({
      ok: true,
      cantidad: conflictos.length,
      conflictos,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error obteniendo auditoría",
      error: error.message,
    });
  }
}