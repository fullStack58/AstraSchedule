// src/routes/ai.routes.js
import { Router } from 'express';
import { wrap } from '../middleware/asyncWrapper.js';
import { validate, schemaChatMessage } from '../middleware/validators.js';
import { chatCompletion, chatStream } from '../services/ai.service.js';

const router = Router();

/**
 * POST /api/ai/chat
 * Body: { message, history?, stream? }
 *
 * Si stream=false (default) → respuesta JSON normal.
 * Si stream=true → respuesta SSE (text/event-stream).
 *
 * Ejemplo curl:
 *   curl -X POST http://localhost:3001/api/ai/chat \
 *        -H "Content-Type: application/json" \
 *        -d '{"message":"¿Cuántos grupos de IS sin horario en jornada Diurna?"}'
 */
router.post('/chat', validate(schemaChatMessage), wrap(async (req, res) => {
  const { message, history, stream } = req.body;

  if (stream) {
    // SSE streaming
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx pass-through
    res.flushHeaders();
    await chatStream(message, history, res);
    return;
  }

  // Respuesta JSON normal
  const result = await chatCompletion(message, history);
  res.json({ ok: true, data: result });
}));

export default router;
