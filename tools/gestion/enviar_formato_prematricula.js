import { pool } from '../../scripts/db.js';

/**
 * Genera y simula el envío del formato de prematrícula al director.
 * @param {Object} args
 * @param {number|string} args.estudiante_id
 * @param {string} args.estudiante_nombre
 * @param {string} args.programa_id
 * @param {number} args.semestre_actual
 * @param {Array<number>} args.materias_solicitadas
 */
export async function enviar_formato_prematricula({
    estudiante_id,
    estudiante_nombre,
    programa_id,
    semestre_actual,
    materias_solicitadas
}) {
    if (!estudiante_id || !materias_solicitadas || !Array.isArray(materias_solicitadas)) {
        return JSON.stringify({
            success: false,
            error: 'Parámetros incompletos. Faltan datos del estudiante o el listado de materias.'
        });
    }

    try {
        // Enriquecemos el formato consultando el nombre y créditos de las materias reales
        const query = `
      SELECT id, codigo, nombre, creditos
      FROM materias
      WHERE id = ANY($1::int[])
    `;
        const { rows } = await pool.query(query, [materias_solicitadas]);

        if (rows.length === 0 && materias_solicitadas.length > 0) {
            return JSON.stringify({
                success: false,
                error: 'Ninguna de las materias solicitadas fue encontrada en la base de datos.'
            });
        }

        const detalleMaterias = rows.map(m => `${m.codigo} - ${m.nombre} (${m.creditos} cr.)`);
        const totalCreditos = rows.reduce((sum, m) => sum + m.creditos, 0);

        // Formato estructurado para que Groq lo lea y lo "notifique"
        const formato = {
            estudiante: {
                id: estudiante_id,
                nombre: estudiante_nombre,
                programa: programa_id,
                semestre: semestre_actual
            },
            solicitud: {
                total_materias: rows.length,
                total_creditos: totalCreditos,
                detalle: detalleMaterias
            },
            estado: 'Enviado a Dirección para revisión',
            timestamp: new Date().toISOString()
        };

        return JSON.stringify({
            success: true,
            mensaje: `Formato estructurado y "enviado" al director exitosamente.`,
            data: formato
        });

    } catch (error) {
        return JSON.stringify({
            success: false,
            error: `Error al generar el formato: ${error.message}`
        });
    }
}