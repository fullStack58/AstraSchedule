// src/config/db.js
// Pool de PostgreSQL — reutiliza la misma lógica de scripts/db.js del proyecto original

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT)    || 5432,
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'uniajc_horarios',
  // Parámetros de producción razonables
  max:             10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('⚠️  Error inesperado en cliente PostgreSQL:', err.message);
});

// Verificación de conexión al arrancar
export async function checkDbConnection() {
  const client = await pool.connect();
  const { rows } = await client.query('SELECT current_database() AS db, NOW() AS ts');
  client.release();
  return rows[0];
}
