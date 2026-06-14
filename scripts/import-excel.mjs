#!/usr/bin/env node
/**
 * Import script: reads Whakoom Excel export → SQLite
 * Usage: node scripts/import-excel.mjs path/to/BaseDatosComicsWhakoom.xlsx
 */

import { createClient } from '@libsql/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'comics.db');
const db = createClient({ url: `file:${DB_PATH}` });

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS series (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL UNIQUE,
      publisher    TEXT,
      description  TEXT,
      total_issues INTEGER,
      cover_url    TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comics (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      wkid         INTEGER UNIQUE,
      series_id    INTEGER REFERENCES series(id),
      edition      TEXT,
      number       REAL,
      title        TEXT,
      publisher    TEXT,
      language     TEXT,
      release_date TEXT,
      url          TEXT,
      cover_url    TEXT,
      cover_local  TEXT,
      synopsis     TEXT,
      authors      TEXT,
      isbn         TEXT,
      pages        INTEGER,
      grade        TEXT,
      place        TEXT,
      notes        TEXT,
      readed       INTEGER DEFAULT 0,
      enriched_at  TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_comics_series ON comics(series_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_comics_number ON comics(series_id, number)`);
}

function clean(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'nan') return null;
  return s;
}

function cleanNum(val) {
  if (val === undefined || val === null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function getOrCreateSeries(name, publisher) {
  const existing = await db.execute({
    sql: 'SELECT id FROM series WHERE name = ?',
    args: [name],
  });
  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await db.execute({
    sql: 'INSERT INTO series (name, publisher) VALUES (?, ?) RETURNING id',
    args: [name, publisher],
  });
  return result.rows[0].id;
}

async function importExcel(filePath) {
  console.log(`\n📂 Leyendo: ${filePath}`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`📊 ${rows.length} filas encontradas`);

  await initDb();

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const wkid    = cleanNum(row['Wkid']);
      const series  = clean(row['Series']);
      const edition = clean(row['Edition']);
      const number  = cleanNum(row['Number']);
      const title   = clean(row['Title']);
      const pub     = clean(row['Publisher']);
      const lang    = clean(row['Language']);
      const release = clean(row['Release']);
      const grade   = clean(row['Grade']);
      const place   = clean(row['Place']);
      const notes   = clean(row['Notes']);
      const readed  = row['Readed'] ? 1 : 0;
      const url     = clean(row['Url']);

      if (!series) { errors++; continue; }

      const seriesId = await getOrCreateSeries(series, pub);

      // Check existing
      const existing = wkid
        ? await db.execute({ sql: 'SELECT id FROM comics WHERE wkid = ?', args: [wkid] })
        : await db.execute({ sql: 'SELECT id FROM comics WHERE series_id = ? AND number IS ? AND title IS ?', args: [seriesId, number, title] });

      if (existing.rows.length > 0) {
        await db.execute({
          sql: `UPDATE comics SET
            series_id=?, edition=?, number=?, title=?, publisher=?, language=?,
            release_date=?, url=?, grade=?, place=?, notes=?, readed=?,
            updated_at=datetime('now')
            WHERE id=?`,
          args: [seriesId, edition, number, title, pub, lang, release, url, grade, place, notes, readed, existing.rows[0].id],
        });
        updated++;
      } else {
        await db.execute({
          sql: `INSERT INTO comics
            (wkid, series_id, edition, number, title, publisher, language, release_date, url, grade, place, notes, readed)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [wkid, seriesId, edition, number, title, pub, lang, release, url, grade, place, notes, readed],
        });
        inserted++;
      }
    } catch (e) {
      console.error(`  ⚠️  Error en fila:`, row['Series'], '-', row['Title'], ':', e.message);
      errors++;
    }
  }

  const seriesCount = await db.execute('SELECT COUNT(*) as c FROM series');
  const comicsCount = await db.execute('SELECT COUNT(*) as c FROM comics');

  console.log(`\n✅ Importación completada:`);
  console.log(`   📚 Insertados: ${inserted}`);
  console.log(`   🔄 Actualizados: ${updated}`);
  console.log(`   ⚠️  Errores: ${errors}`);
  console.log(`   📖 Total cómics en BBDD: ${comicsCount.rows[0].c}`);
  console.log(`   📂 Total series en BBDD: ${seriesCount.rows[0].c}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Uso: node scripts/import-excel.mjs <ruta-al-excel>');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`❌ Archivo no encontrado: ${filePath}`);
  process.exit(1);
}

importExcel(filePath).catch(console.error);
