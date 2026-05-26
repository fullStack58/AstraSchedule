// seed/seed-from-excel.js
// Lee el archivo Excel real de UNIAJC e inserta todos los datos en PostgreSQL.
// Reemplaza los seeds de prueba con datos reales del semestre.
//
// Uso:
//   node seed/seed-from-excel.js
//
// Requiere: npm install xlsx (en la raíz del proyecto)

import pg from 'pg';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT) || 5432,
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'uniajc_horarios',
});

// ─── Ruta al Excel ────────────────────────────────────────────────────────────
const EXCEL_PATH = join(__dirname, '..', 'Informacio_n_Asinacio_n_Grupos_.xlsx');

// ─── Mapeo de horas → bloques normalizados ────────────────────────────────────
// El Excel tiene formatos inconsistentes. Los normalizamos a HH:MM-HH:MM
function normalizarHora(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.split('\n')[0].trim().toLowerCase(); // quitar notas como "Inicia 10 febrero"

  // Patrones conocidos → [hora_inicio, hora_fin]
  if (s.includes('7:00') && s.includes('10:00') || s.includes('7am') && s.includes('10:00')) return ['07:00', '10:00'];
  if (s.includes('7:00') && s.includes('1:00'))  return ['07:00', '13:00']; // bloque doble raro
  if (s.includes('10:00') && (s.includes('1:00') || s.includes('13:00'))) return ['10:00', '13:00'];
  if (s.includes('1:00pm') && s.includes('4:00')) return ['13:00', '16:00'];
  if (s.includes('2:00') && s.includes('5:00'))  return ['14:00', '17:00'];
  if (s.includes('3:00') && s.includes('6:00'))  return ['15:00', '18:00'];
  if (s.includes('4:00') && s.includes('7:00'))  return ['16:00', '19:00'];
  if (s.includes('6:30') && s.includes('9:30'))  return ['18:30', '21:30'];
  return null;
}

// ─── Mapeo de semestre romano → número ───────────────────────────────────────
const SEM_MAP = { 'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VII ':7,'VIII':8,'IX':9,'X':10 };

// ─── Normalizar nombre de aula ────────────────────────────────────────────────
function normalizarAula(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === '0' || s.startsWith('http') || s === 'AULA' || s === 'SALA ' || s === ' ') return null;
  return s.replace(/\s+/g, '_').toUpperCase();
}

// ─── Detectar tipo de aula ────────────────────────────────────────────────────
function tipoAula(codigo, recurso) {
  if (!codigo) return 'virtual';
  const c = codigo.toLowerCase();
  const r = (recurso || '').toLowerCase();
  if (c.includes('sala') || r.includes('sala')) return 'laboratorio';
  if (c.startsWith('http') || r.includes('virtual') || r.includes('remota')) return 'virtual';
  return 'presencial';
}

// ─── Normalizar nombre de materia ─────────────────────────────────────────────
function normalizarMateria(raw) {
  return String(raw || '').trim()
    .replace(/\s+/g, ' ')
    .replace(/\(LAB\)/i, '(Lab)');
}

// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('📂 Leyendo Excel...');
  const wb = XLSX.readFile(EXCEL_PATH);

  // Configuración de cada hoja
  const HOJAS = [
    { nombre: 'NORTE DIURNO',   sede: 'NORTE', jornada: 'Diurna',   colEst: '# EST' },
    { nombre: 'NORTE NOCTURNO', sede: 'NORTE', jornada: 'Nocturna', colEst: '# Estudiantes' },
    { nombre: 'SUR NOCTURNO',   sede: 'SUR',   jornada: 'Nocturna', colEst: '# Est' },
    { nombre: 'SUR DIURNO1',    sede: 'SUR',   jornada: 'Diurna',   colEst: '# de Estudiantes' },
  ];

  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Acumuladores
  const materias  = new Map(); // nombre → id
  const salones   = new Map(); // codigo → id
  const grupos    = [];        // { grupo, materia, sede, jornada, semestre, cupo, aula, horarios[] }

  // ── Leer todas las hojas ──────────────────────────────────────────────────
  for (const hoja of HOJAS) {
    const ws   = wb.Sheets[hoja.nombre];
    if (!ws) { console.warn(`  ⚠️  Hoja "${hoja.nombre}" no encontrada`); continue; }
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    console.log(`  📋 ${hoja.nombre}: ${rows.length} filas`);

    let semActual = null;
    let grupoActual = null;

    for (const row of rows) {
      // Actualizar semestre cuando cambia
      if (row['SEM'] && String(row['SEM']).trim()) {
        semActual = SEM_MAP[String(row['SEM']).trim()] || null;
      }

      // Código de grupo
      const codigoGrupo = row['Grupo'] ? String(row['Grupo']).trim() : null;
      if (codigoGrupo) grupoActual = codigoGrupo;

      const materia = normalizarMateria(row['Nombre Asignatura']);
      if (!materia || materia === 'null') continue;

      const cupo   = parseInt(row[hoja.colEst]) || 30;
      const aula   = normalizarAula(row['AULA']);
      const recurso = String(row['RECURSO FISICO'] || row['RECUSO FISICO'] || '').trim();

      // Recolectar horarios de cada día
      const horariosDia = [];
      for (const dia of DIAS) {
        const val = row[dia];
        if (!val || String(val).trim() === '') continue;
        const horas = normalizarHora(String(val));
        if (horas) {
          horariosDia.push({ dia: dia === 'Miércoles' ? 'Miercoles' : dia, hora_inicio: horas[0], hora_fin: horas[1] });
        }
      }

      // Registrar materia
      if (!materias.has(materia)) materias.set(materia, null);

      // Registrar salón
      if (aula && !salones.has(aula)) {
        salones.set(aula, { tipo: tipoAula(aula, recurso), sede: hoja.sede });
      }

      grupos.push({
        codigo:    grupoActual || 'GRP',
        materia,
        sede:      hoja.sede,
        jornada:   hoja.jornada,
        semestre:  semActual || 2,
        cupo,
        aula,
        horarios:  horariosDia,
      });
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Materias únicas: ${materias.size}`);
  console.log(`   Salones únicos:  ${salones.size}`);
  console.log(`   Filas de grupos: ${grupos.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERCIÓN EN BASE DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Obtener periodo activo ─────────────────────────────────────────
    const { rows: periodos } = await client.query(
      `SELECT id FROM periodos_academicos WHERE activo = true LIMIT 1`
    );
    if (periodos.length === 0) throw new Error('No hay periodo académico activo. Ejecuta primero: npm run seed:periodos');
    const periodo_id = periodos[0].id;
    console.log(`\n✅ Periodo activo ID: ${periodo_id}`);

    // ── 2. Obtener programa IS ────────────────────────────────────────────
    const { rows: programas } = await client.query(
      `SELECT id, codigo FROM programas`
    );
    if (programas.length === 0) throw new Error('No hay programas. Ejecuta primero: npm run seed:horarios');
    const programa_id = programas[0].id;
    console.log(`✅ Programa: ${programas[0].codigo} (ID: ${programa_id})`);

    // ── 3. Obtener sedes ──────────────────────────────────────────────────
    const { rows: sedesRows } = await client.query(`SELECT id, codigo FROM sedes`);
    const sedeMap = Object.fromEntries(sedesRows.map(s => [s.codigo, s.id]));
    console.log(`✅ Sedes encontradas: ${Object.keys(sedeMap).join(', ')}`);

    // ── 4. Obtener jornadas ───────────────────────────────────────────────
    const { rows: jornadasRows } = await client.query(`SELECT id, codigo FROM jornadas`);
    const jornadaMap = Object.fromEntries(jornadasRows.map(j => [j.codigo, j.id]));
    console.log(`✅ Jornadas encontradas: ${Object.keys(jornadaMap).join(', ')}`);

    // ── 5. Insertar materias ──────────────────────────────────────────────
    console.log('\n📚 Insertando materias...');
    let semCounter = 2;
    for (const [nombre] of materias) {
      // Determinar semestre aproximado por nombre
      const sem = semCounter % 10 + 1;
      const { rows } = await client.query(
        `INSERT INTO materias (codigo, nombre, programa_id, semestre, creditos, horas_semana, tipo_aula_requerida, activa)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id`,
        [
          `MAT-${String(materias.size - [...materias.keys()].indexOf(nombre)).padStart(3,'0')}`,
          nombre,
          programa_id,
          Math.min(semCounter, 10),
          3,
          3,
          nombre.toLowerCase().includes('lab') ? 'laboratorio' : 'cualquiera',
        ]
      );
      materias.set(nombre, rows[0].id);
      semCounter++;
    }
    console.log(`   ✅ ${materias.size} materias insertadas`);

    // ── 6. Insertar salones ───────────────────────────────────────────────
    console.log('\n🏫 Insertando salones...');
    let salonesInsertados = 0;
    for (const [codigo, info] of salones) {
      const sede_id = sedeMap[info.sede];
      if (!sede_id) continue;
      const { rows } = await client.query(
        `INSERT INTO salones (codigo, sede_id, tipo, capacidad, disponible)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (codigo) DO UPDATE SET tipo = EXCLUDED.tipo
         RETURNING id`,
        [codigo, sede_id, info.tipo, 40]
      );
      salones.set(codigo, rows[0].id);
      salonesInsertados++;
    }
    console.log(`   ✅ ${salonesInsertados} salones insertados`);

    // ── 7. Insertar grupos y horarios ─────────────────────────────────────
    console.log('\n👥 Insertando grupos y horarios...');
    let gruposInsertados = 0;
    let horariosInsertados = 0;
    const gruposYaInsertados = new Set();

    for (const g of grupos) {
      const materia_id = materias.get(g.materia);
      if (!materia_id) continue;

      const jornada_id = jornadaMap[g.jornada];
      const sede_id    = sedeMap[g.sede];
      if (!jornada_id || !sede_id) continue;

      // Clave única para evitar duplicados
      const claveGrupo = `${g.codigo}-${g.materia}-${g.sede}-${g.jornada}`;
      let grupo_id;

      if (!gruposYaInsertados.has(claveGrupo)) {
        const { rows } = await client.query(
          `INSERT INTO grupos (materia_id, periodo_id, numero, cupo_max, jornada_id, sede_id, modalidad, estado)
           VALUES ($1, $2, $3, $4, $5, $6, 'presencial', 'abierto')
           ON CONFLICT ON CONSTRAINT uq_grupo_combinacion DO UPDATE SET cupo_max = EXCLUDED.cupo_max
           RETURNING id`,
          [materia_id, periodo_id, g.codigo, g.cupo, jornada_id, sede_id]
        );
        grupo_id = rows[0].id;
        gruposYaInsertados.set(claveGrupo, grupo_id);
        gruposInsertados++;
      } else {
        grupo_id = gruposYaInsertados.get(claveGrupo);
      }

      // Insertar horarios si tiene aula y franjas
      if (g.aula && salones.get(g.aula) && g.horarios.length > 0) {
        const salon_id = salones.get(g.aula);

        for (const h of g.horarios) {
          // Buscar franja correspondiente
          const { rows: franjas } = await client.query(
            `SELECT f.id FROM franjas_horarias f
             JOIN bloques_horarios b ON b.id = f.bloque_id
             JOIN periodos_academicos p ON p.id = f.periodo_id AND p.activo = true
             WHERE f.dia = $1 AND b.hora_inicio = $2::time AND b.hora_fin = $3::time
             LIMIT 1`,
            [h.dia, h.hora_inicio, h.hora_fin]
          );

          if (franjas.length === 0) {
            // Crear bloque si no existe
            const jornada_bloque = g.jornada === 'Nocturna' ? jornadaMap['Nocturna'] : jornadaMap['Diurna'];
            const codigoBloque = `${g.jornada === 'Nocturna' ? 'N' : 'D'}_${h.dia.substring(0,3).toUpperCase()}_${h.hora_inicio.replace(':','')}`;
            
            await client.query(
              `INSERT INTO bloques_horarios (codigo, nombre, jornada_id, hora_inicio, hora_fin, orden)
               VALUES ($1, $2, $3, $4::time, $5::time, 99)
               ON CONFLICT (codigo) DO NOTHING`,
              [codigoBloque, `${h.dia} ${h.hora_inicio}-${h.hora_fin}`, jornada_bloque, h.hora_inicio, h.hora_fin]
            );

            const { rows: bloque } = await client.query(
              `SELECT id FROM bloques_horarios WHERE codigo = $1`, [codigoBloque]
            );
            if (bloque.length > 0) {
              await client.query(
                `INSERT INTO franjas_horarias (periodo_id, bloque_id, dia)
                 VALUES ($1, $2, $3)
                 ON CONFLICT ON CONSTRAINT franjas_horarias_periodo_id_bloque_id_dia_key DO NOTHING`,
                [periodo_id, bloque[0].id, h.dia]
              );
            }
            continue; // skip this horario, next seed run will find it
          }

          const franja_id = franjas[0].id;

          // Insertar horario (sin docente por ahora — el Excel no tiene nombres reales)
          // Buscamos un docente disponible cualquiera para cumplir el NOT NULL
          const { rows: docentes } = await client.query(
            `SELECT id FROM docentes WHERE activo = true LIMIT 1`
          );
          if (docentes.length === 0) continue;

          await client.query(
            `INSERT INTO horario_asignado (grupo_id, docente_id, salon_id, franja_id, estado)
             VALUES ($1, $2, $3, $4, 'propuesto')
             ON CONFLICT DO NOTHING`,
            [grupo_id, docentes[0].id, salon_id, franja_id]
          );
          horariosInsertados++;
        }
      }
    }

    await client.query('COMMIT');

    console.log(`\n🎉 Seed completado exitosamente:`);
    console.log(`   ✅ Grupos insertados:   ${gruposInsertados}`);
    console.log(`   ✅ Horarios insertados:  ${horariosInsertados}`);
    console.log(`   ✅ Materias insertadas:  ${materias.size}`);
    console.log(`   ✅ Salones insertados:   ${salonesInsertados}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error — rollback ejecutado:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
