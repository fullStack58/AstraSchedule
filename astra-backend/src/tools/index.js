// src/tools/index.js
// Proxy que re-exporta todas las funciones del tools/index.js original.
// Permite que ai.service.js las importe sin modificar el proyecto base.

// NOTA: Ajusta la ruta relativa según dónde clone el frontend respecto al backend.
// Si el backend REST vive dentro del mismo repo en /backend/, la ruta sería:
//   export * from '../../../tools/index.js';
// Si es un repo separado con symlink o copia:
//   export * from '../../../tools/index.js';

// Para el entorno de desarrollo actual (backend en carpeta hermana del raíz):
export * from "../../../tools/index.js";
