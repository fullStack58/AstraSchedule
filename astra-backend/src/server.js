// src/server.js
// Punto de entrada principal del servidor REST AstraSchedule.

import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import morgan  from 'morgan';

import { checkDbConnection }   from './config/db.js';
import { errorHandler }        from './middleware/errorHandler.js';

import horariosRouter   from './routes/horarios.routes.js';
import docentesRouter   from './routes/docentes.routes.js';
import salonesRouter    from './routes/salones.routes.js';
import { gruposRouter, materiasRouter } from './routes/grupos.routes.js';
import conflictosRouter from './routes/conflictos.routes.js';
import dashboardRouter  from './routes/dashboard.routes.js';
import aiRouter         from './routes/ai.routes.js';

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Vite dev server
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const db = await checkDbConnection();
    res.json({ ok: true, service: 'AstraSchedule API', db, ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Database unreachable', detail: err.message });
  }
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/horarios',   horariosRouter);
app.use('/api/docentes',   docentesRouter);
app.use('/api/salones',    salonesRouter);
app.use('/api/grupos',     gruposRouter);
app.use('/api/materias',   materiasRouter);
app.use('/api/conflictos', conflictosRouter);
app.use('/api/ai',         aiRouter);

// 404 para rutas no definidas
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
});

// ── Error handler central ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    const db = await checkDbConnection();
    console.log(`✅ PostgreSQL conectado → ${db.db} @ ${new Date(db.ts).toLocaleTimeString()}`);
    app.listen(PORT, () => {
      console.log(`🚀 AstraSchedule API corriendo en http://localhost:${PORT}`);
      console.log(`   Endpoints disponibles:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /api/dashboard`);
      console.log(`   GET  /api/horarios/resumen?programa_id=IS&jornada=Diurna&modalidad=presencial`);
      console.log(`   GET  /api/horarios/sin-horario?programa_id=IS&jornada=Diurna`);
      console.log(`   POST /api/horarios/asignar`);
      console.log(`   GET  /api/docentes/disponibles?dia=Lunes&hora_inicio=07:00&hora_fin=10:00`);
      console.log(`   GET  /api/salones/disponibles?dia=Lunes&hora_inicio=07:00&hora_fin=10:00`);
      console.log(`   GET  /api/conflictos`);
      console.log(`   POST /api/ai/chat`);
    });
  } catch (err) {
    console.error('❌ No se pudo conectar a PostgreSQL:', err.message);
    console.error('   Verifica tu archivo .env y que PostgreSQL esté corriendo.');
    process.exit(1);
  }
}

start();
