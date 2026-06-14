#!/usr/bin/env node
/**
 * Corrige la portada de un cómic manualmente.
 *
 * Uso:
 *   node scripts/fix-cover.mjs --wkid 1234 --url "https://..."
 *   node scripts/fix-cover.mjs --wkid 1234 --file "C:\Users\santi\Downloads\portada.jpg"
 *   node scripts/fix-cover.mjs --list   → muestra todos los cómics con su wkid
 *   node scripts/fix-cover.mjs --list --sin-portada  → solo los que no tienen portada
 */

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, '..', 'comics.db');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');

if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

const db = createClient({ url: `file:${DB_PATH}` });
const args = process.argv.slice(2);

// ── --list ────────────────────────────────────────────────────────────────────
if (args.includes('--list')) {
  const onlyMissing = args.includes('--sin-portada');
  const sql = onlyMissing
    ? `SELECT c.wkid, c.title, c.number, s.name as series, c.cover_local
       FROM comics c JOIN series s ON s.id = c.series_id
       WHERE c.cover_local IS NULL
       ORDER BY s.name, c.number NULLS LAST`
    : `SELECT c.wkid, c.title, c.number, s.name as series, c.cover_local
       FROM comics c JOIN series s ON s.id = c.series_id
       ORDER BY s.name, c.number NULLS LAST`;

  const result = await db.execute(sql);
  console.log(`\n${'WKID'.padEnd(12)} ${'SERIE'.padEnd(35)} ${'Nº'.padEnd(5)} ${'PORTADA'.padEnd(20)} TÍTULO`);
  console.log('─'.repeat(100));
  for (const r of result.rows) {
    const wkid   = String(r.wkid ?? '—').padEnd(12);
    const serie  = String(r.series ?? '—').slice(0, 34).padEnd(35);
    const num    = String(r.number ?? '—').padEnd(5);
    const cover  = String(r.cover_local ?? '❌ sin portada').padEnd(20);
    const title  = String(r.title ?? '').slice(0, 40);
    console.log(`${wkid} ${serie} ${num} ${cover} ${title}`);
  }
  console.log(`\nTotal: ${result.rows.length} cómics`);
  process.exit(0);
}

// ── --wkid + --url / --file ───────────────────────────────────────────────────
const wkidIdx = args.indexOf('--wkid');
const urlIdx  = args.indexOf('--url');
const fileIdx = args.indexOf('--file');

if (wkidIdx === -1) {
  console.error('\n❌ Uso:');
  console.error('   node scripts/fix-cover.mjs --wkid NUMERO --url "https://..."');
  console.error('   node scripts/fix-cover.mjs --wkid NUMERO --file "ruta/a/imagen.jpg"');
  console.error('   node scripts/fix-cover.mjs --list');
  console.error('   node scripts/fix-cover.mjs --list --sin-portada\n');
  process.exit(1);
}

const wkid = parseInt(args[wkidIdx + 1]);
if (isNaN(wkid)) { console.error('❌ El wkid debe ser un número'); process.exit(1); }

// Buscar el cómic
const found = await db.execute({ sql: `SELECT c.*, s.name as series_name FROM comics c JOIN series s ON s.id=c.series_id WHERE c.wkid = ?`, args: [wkid] });
if (!found.rows.length) { console.error(`❌ No se encontró ningún cómic con wkid=${wkid}`); process.exit(1); }
const comic = found.rows[0];
console.log(`\n📖 Cómic: ${comic.series_name} — ${comic.title ?? 'Sin título'} (wkid: ${wkid})`);
if (comic.cover_local) console.log(`   Portada actual: ${comic.cover_local}`);

// ── Opción A: desde URL ───────────────────────────────────────────────────────
if (urlIdx !== -1) {
  const imageUrl = args[urlIdx + 1];
  if (!imageUrl) { console.error('❌ Falta la URL'); process.exit(1); }

  console.log(`\n⬇️  Descargando desde: ${imageUrl}`);

  const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? 'jpg';
  const filename = `${wkid}.${ext}`;
  const destPath = path.join(COVERS_DIR, filename);

  await new Promise((resolve, reject) => {
    const lib = imageUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    lib.get(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' },
    }, (res) => {
      if (res.statusCode !== 200) { file.close(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });

  const stat = fs.statSync(destPath);
  if (stat.size < 1000) { fs.unlinkSync(destPath); console.error('❌ La imagen está vacía o es demasiado pequeña'); process.exit(1); }

  await db.execute({
    sql: `UPDATE comics SET cover_local = ?, cover_url = ?, updated_at = datetime('now') WHERE wkid = ?`,
    args: [filename, imageUrl, wkid],
  });

  console.log(`✅ Portada actualizada: ${filename} (${Math.round(stat.size / 1024)}KB)`);
}

// ── Opción B: desde archivo local ─────────────────────────────────────────────
else if (fileIdx !== -1) {
  const srcPath = args[fileIdx + 1];
  if (!srcPath || !fs.existsSync(srcPath)) { console.error(`❌ Archivo no encontrado: ${srcPath}`); process.exit(1); }

  const ext = path.extname(srcPath).replace('.', '') || 'jpg';
  const filename = `${wkid}.${ext}`;
  const destPath = path.join(COVERS_DIR, filename);

  fs.copyFileSync(srcPath, destPath);

  await db.execute({
    sql: `UPDATE comics SET cover_local = ?, updated_at = datetime('now') WHERE wkid = ?`,
    args: [filename, wkid],
  });

  const stat = fs.statSync(destPath);
  console.log(`✅ Portada copiada: ${filename} (${Math.round(stat.size / 1024)}KB)`);
}

else {
  console.error('❌ Especifica --url o --file');
  process.exit(1);
}

console.log('💡 Reinicia el servidor (npm run dev) para ver el cambio.\n');
