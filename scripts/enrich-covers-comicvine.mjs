#!/usr/bin/env node
/**
 * Script de enriquecimiento de portadas via ComicVine API
 * Úsalo para los cómics que fallaron con Whakoom (Invalid URL, errores HTTP, etc.)
 *
 * PASO 1: Consigue una API key gratis en https://comicvine.gamespot.com/api/
 *         (registro gratuito, API key instantánea)
 *
 * Uso:
 *   node scripts/enrich-covers-comicvine.mjs --key TU_API_KEY
 *   node scripts/enrich-covers-comicvine.mjs --key TU_API_KEY --limit 20
 *   node scripts/enrich-covers-comicvine.mjs --key TU_API_KEY --dry-run
 *   node scripts/enrich-covers-comicvine.mjs --key TU_API_KEY --force   (reprocesa todos)
 */

import { createClient } from '@libsql/client';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, '..', 'comics.db');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');

if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

const db = createClient({ url: `file:${DB_PATH}` });

// ── Argumentos ───────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const keyIdx = args.indexOf('--key');
const API_KEY = keyIdx !== -1 ? args[keyIdx + 1] : null;
const LIMIT   = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 9999;
const FORCE   = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const DELAY_MS = 1100; // ComicVine permite ~200 req/hora, ~1 req/segundo

if (!API_KEY) {
  console.error('\n❌ Falta la API key de ComicVine.');
  console.error('   Consíguela gratis en: https://comicvine.gamespot.com/api/');
  console.error('   Uso: node scripts/enrich-covers-comicvine.mjs --key TU_API_KEY\n');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'MiColeccionComics/1.0',
        'Accept': 'application/json',
      },
    }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON inválido')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, {
      headers: { 'User-Agent': 'MiColeccionComics/1.0' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', err => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout imagen')); });
  });
}

/**
 * Busca en ComicVine por título + serie.
 * Devuelve la URL de la imagen de portada o null.
 */
async function searchComicVine(title, seriesName, number) {
  // Construir query: intentamos con título primero, luego con serie+número
  const queries = [];

  if (title && title !== 'nan') {
    queries.push(encodeURIComponent(title.slice(0, 60)));
  }
  if (seriesName) {
    const q = number ? `${seriesName} ${number}` : seriesName;
    queries.push(encodeURIComponent(q.slice(0, 60)));
  }

  for (const q of queries) {
    const url = `https://comicvine.gamespot.com/api/search/?api_key=${API_KEY}&format=json&resources=issue&query=${q}&field_list=id,name,image,volume,issue_number&limit=5`;

    try {
      const data = await fetchJson(url);
      if (data.error !== 'OK' || !data.results?.length) continue;

      // Buscar el resultado más relevante
      for (const result of data.results) {
        const img = result.image?.medium_url || result.image?.small_url || result.image?.thumb_url;
        if (img && !img.includes('default')) {
          return img;
        }
      }
    } catch (e) {
      // Intentar siguiente query
    }

    await sleep(600); // Entre queries de la misma búsqueda
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎨 Enriquecimiento de portadas via ComicVine API');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('🔍 MODO DRY-RUN\n');

  // Obtener cómics sin portada
  const sql = FORCE
    ? `SELECT c.id, c.wkid, c.title, c.number, c.url, s.name as series_name
       FROM comics c JOIN series s ON s.id = c.series_id
       WHERE c.wkid IS NOT NULL
       ORDER BY c.id ASC LIMIT ?`
    : `SELECT c.id, c.wkid, c.title, c.number, c.url, s.name as series_name
       FROM comics c JOIN series s ON s.id = c.series_id
       WHERE c.cover_local IS NULL
       ORDER BY c.id ASC LIMIT ?`;

  const result = await db.execute({ sql, args: [LIMIT] });
  const comics = result.rows;

  console.log(`📚 Cómics a procesar: ${comics.length}`);
  console.log('🔑 API Key:', API_KEY.slice(0, 8) + '…');
  console.log('');

  let ok = 0, skipped = 0, errors = 0;

  for (let i = 0; i < comics.length; i++) {
    const { id, wkid, title, number, series_name } = comics[i];
    const label = `[${i + 1}/${comics.length}] ${series_name}${number ? ' #' + number : ''} — ${title ?? ''}`.slice(0, 70);

    process.stdout.write(`  ${label} … `);

    if (DRY_RUN) {
      console.log(`→ buscaría en ComicVine`);
      continue;
    }

    try {
      const coverUrl = await searchComicVine(title, series_name, number);

      if (!coverUrl) {
        console.log('⚠️  no encontrada');
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // Descargar imagen
      const ext = coverUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? 'jpg';
      const filename = `${wkid}.${ext}`;
      const destPath = path.join(COVERS_DIR, filename);

      await downloadImage(coverUrl, destPath);

      const stat = fs.statSync(destPath);
      if (stat.size < 2000) {
        fs.unlinkSync(destPath);
        console.log('⚠️  imagen demasiado pequeña');
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // Actualizar DB
      await db.execute({
        sql: `UPDATE comics SET cover_local = ?, cover_url = ?, enriched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        args: [filename, coverUrl, id],
      });

      console.log(`✅ ${filename} (${Math.round(stat.size / 1024)}KB)`);
      ok++;

    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`✅ Descargadas:  ${ok}`);
  console.log(`⚠️  No encontradas: ${skipped}`);
  console.log(`❌ Errores:      ${errors}`);

  if (ok > 0) {
    console.log('\n💡 Reinicia el servidor (npm run dev) para ver las portadas.');
  }
}

main().catch(console.error);
