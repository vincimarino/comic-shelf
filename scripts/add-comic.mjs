#!/usr/bin/env node
/**
 * Añade un cómic nuevo a la base de datos manualmente.
 *
 * Uso interactivo:
 *   node scripts/add-comic.mjs
 *
 * O con parámetros:
 *   node scripts/add-comic.mjs --series "Batman" --title "El Caballero Oscuro" --number 1 --publisher "ECC"
 *
 * Para la portada, después de añadir el cómic:
 *   1. Guarda la imagen en public/covers/{wkid}.jpg
 *   2. O usa: node scripts/fix-cover.mjs --wkid {wkid} --url "https://..."
 *
 * Para añadir varios cómics de golpe, es más fácil añadirlos al Excel
 * y volver a ejecutar: node scripts/import-excel.mjs tu-excel.xlsx
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'comics.db');
const db        = createClient({ url: `file:${DB_PATH}` });

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

function clean(v) {
  if (!v || v.trim() === '' || v.toLowerCase() === 'nan') return null;
  return v.trim();
}

async function getOrCreateSeries(name, publisher) {
  const existing = await db.execute({ sql: 'SELECT id FROM series WHERE name = ?', args: [name] });
  if (existing.rows.length > 0) return Number(existing.rows[0].id);
  const result = await db.execute({
    sql: 'INSERT INTO series (name, publisher) VALUES (?, ?) RETURNING id',
    args: [name, publisher],
  });
  return Number(result.rows[0].id);
}

async function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n➕ Añadir cómic a la colección');
  console.log('━'.repeat(40));

  let series, title, number, publisher, language, releaseDate, edition, notes;

  // Si hay argumentos, usarlos; si no, preguntar interactivamente
  if (args.length > 0) {
    series      = getArg('--series');
    title       = getArg('--title');
    number      = getArg('--number');
    publisher   = getArg('--publisher');
    language    = getArg('--language') ?? 'Español (España)';
    releaseDate = getArg('--release');
    edition     = getArg('--edition');
    notes       = getArg('--notes');
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('(Deja en blanco los campos opcionales)\n');
    series      = await prompt(rl, '📚 Serie/Colección (*): ');
    title       = await prompt(rl, '📖 Título (opcional): ');
    number      = await prompt(rl, '🔢 Número en la serie (opcional): ');
    publisher   = await prompt(rl, '🏢 Editorial (opcional): ');
    language    = await prompt(rl, '🌍 Idioma [Español (España)]: ') || 'Español (España)';
    releaseDate = await prompt(rl, '📅 Fecha publicación (ej: Mayo 2024): ');
    edition     = await prompt(rl, '📐 Formato/Edición (ej: Rústica 200 pp): ');
    notes       = await prompt(rl, '📝 Notas personales: ');
    rl.close();
  }

  if (!series?.trim()) {
    console.error('\n❌ El nombre de la serie es obligatorio.');
    process.exit(1);
  }

  const seriesId = await getOrCreateSeries(series.trim(), clean(publisher));

  // Generar un wkid local negativo para no colisionar con Whakoom
  const maxLocal = await db.execute("SELECT MIN(wkid) as m FROM comics WHERE wkid < 0");
  const newWkid  = Math.min(-1, (Number(maxLocal.rows[0].m) || 0) - 1);

  const result = await db.execute({
    sql: `INSERT INTO comics
      (wkid, series_id, title, number, publisher, language, release_date, edition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id`,
    args: [
      newWkid,
      seriesId,
      clean(title),
      number ? parseFloat(number) : null,
      clean(publisher),
      clean(language),
      clean(releaseDate),
      clean(edition),
      clean(notes),
    ],
  });

  const newId = result.rows[0].id;

  console.log('\n✅ Cómic añadido correctamente:');
  console.log(`   ID en DB: ${newId}`);
  console.log(`   WKID local: ${newWkid}`);
  console.log(`   Serie: ${series}`);
  console.log(`   Título: ${clean(title) ?? '(sin título)'}`);
  console.log(`   Nº: ${number ?? '—'}`);
  console.log('');
  console.log('📸 Para añadir la portada:');
  console.log(`   Opción A: Guarda la imagen como public/covers/${newWkid}.jpg`);
  console.log(`   Opción B: node scripts/fix-cover.mjs --wkid ${newWkid} --url "https://..."`);
  console.log(`   Opción C: node scripts/fix-cover.mjs --wkid ${newWkid} --file "ruta/imagen.jpg"`);
  console.log('');
  console.log('💡 Reinicia el servidor para ver el nuevo cómic.\n');
}

main().catch(console.error);
