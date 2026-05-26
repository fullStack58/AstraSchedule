// scripts/check-connection.js
// Verifica la conexión a PostgreSQL y el estado de la base de datos.
// Uso: node scripts/check-connection.js

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT) || 5432,
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'uniajc_horarios',
});

async function check() {
  console.log('🔍 Verificando conexión a PostgreSQL...');
  console.log(`   Host:     ${process.env.PGHOST || 'localhost'}`);
  console.log(`   Puerto:   ${process.env.PGPORT || 5432}`);
  console.log(`   Usuario:  ${process.env.PGUSER || 'postgres'}`);
  console.log(`   Base:     ${process.env.PGDATABASE || 'uniajc_horarios'}`);
  console.log('');

  const client = await pool.connect();

  // Info de conexión
  const { rows: info } = await client.query(
    `SELECT current_database() AS db, current_user AS usuario, version() AS version`
  );
  console.log(`✅ Conectado a: ${info[0].db} como ${info[0].usuario}`);
  console.log(`   ${info[0].version.split(',')[0]}`);
  console.log('');

  // Tablas existentes
  const { rows: tablas } = await client.query(`
    SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS tamaño
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  if (tablas.length === 0) {
    console.log('⚠️  No hay tablas. Ejecuta: npm run bootstrap');
  } else {
    console.log(`📋 Tablas encontradas (${tablas.length}):`);
    for (const t of tablas) {
      // Contar filas
      const { rows: cnt } = await client.query(`SELECT COUNT(*) AS n FROM "${t.tablename}"`);
      const n = parseInt(cnt[0].n);
      const icono = n > 0 ? '✅' : '⬜';
      console.log(`   ${icono} ${t.tablename.padEnd(30)} ${String(n).padStart(5)} filas`);
    }
  }

  console.log('');

  // Periodo activo
  try {
    const { rows: periodo } = await client.query(
      `SELECT codigo, nombre, fecha_inicio, fecha_fin FROM periodos_academicos WHERE activo = true`
    );
    if (periodo.length > 0) {
      console.log(`📅 Periodo activo: ${periodo[0].codigo} — ${periodo[0].nombre}`);
    } else {
      console.log(`⚠️  No hay periodo activo`);
    }
  } catch { console.log('⚠️  Tabla periodos_academicos no existe aún'); }

  client.release();
  await pool.end();
  console.log('\n✅ Verificación completada.');
}

check().catch(err => {
  console.error('❌ Error de conexión:', err.message);
  console.error('');
  console.error('Posibles causas:');
  console.error('  1. PostgreSQL no está corriendo');
  console.error('  2. La contraseña en .env es incorrecta');
  console.error('  3. La base de datos uniajc_horarios no existe');
  console.error('');
  console.error('Solución:');
  console.error('  1. Abre pgAdmin y verifica que el servidor esté activo');
  console.error('  2. Crea la base: CREATE DATABASE uniajc_horarios;');
  console.error('  3. Ajusta PGPASSWORD en el archivo .env');
  process.exit(1);
});
