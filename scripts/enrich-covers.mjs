#!/usr/bin/env node
/**
 * Script de enriquecimiento de portadas desde Whakoom
 *
 * Uso:
 *   node scripts/enrich-covers.mjs             → procesa todos los cómics sin portada
 *   node scripts/enrich-covers.mjs --limit 50  → solo los primeros 50
 *   node scripts/enrich-covers.mjs --force     → reprocesa aunque ya tengan portada
 *   node scripts/enrich-covers.mjs --dry-run   → muestra lo que haría sin descargar nada
 *
 * Requisito: ejecutar desde la carpeta raíz del proyecto (donde está comics.db)
 * El script guarda las portadas en public/covers/{wkid}.jpg
 */

import { createClient } from '@libsql/client';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const cheerio = require('cheerio');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'comics.db');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');

// Asegurar que existe el directorio de portadas
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

const db = createClient({ url: `file:${DB_PATH}` });

// ── Argumentos ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const LIMIT   = args.includes('--limit')   ? parseInt(args[args.indexOf('--limit') + 1])   : 9999;
const FORCE   = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const DELAY_MS = 1200; // ms entre peticiones para no saturar Whakoom

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
    };
    const req = lib.get(url, options, (res) => {
      // Seguir redirecciones
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} en ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.whakoom.com/',
      },
    };
    const req = lib.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} descargando imagen`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', (err) => { file.close(); if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err); });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout descargando imagen')); });
  });
}

/**
 * Extrae la URL de portada de una página de Whakoom.
 * Intenta varias estrategias en orden de fiabilidad.
 */
function extractCoverUrl(html, pageUrl) {
  const $ = cheerio.load(html);

  // Estrategia 1: og:image (la más fiable — Whakoom lo rellena con la portada)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && ogImage.includes('http') && !ogImage.includes('logo') && !ogImage.includes('default')) {
    return ogImage;
  }

  // Estrategia 2: imagen principal del cómic (clase o atributo típico)
  const selectors = [
    'img.comic-cover',
    'img.cover',
    'img.portada',
    '.comic-detail img',
    '.book-cover img',
    'article img[src*="cover"]',
    'article img[src*="comic"]',
    'img[alt*="cover"]',
    'img[alt*="portada"]',
  ];
  for (const sel of selectors) {
    const src = $(sel).first().attr('src');
    if (src && src.includes('http') && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
      return src;
    }
  }

  // Estrategia 3: cualquier imagen grande que parezca portada
  let bestImg = null;
  let bestScore = 0;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src || !src.includes('http')) return;
    if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || src.includes('banner')) return;
    const w = parseInt($(el).attr('width') || '0');
    const h = parseInt($(el).attr('height') || '0');
    const score = w * h;
    if (score > bestScore && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp') || src.includes('image'))) {
      bestScore = score;
      bestImg = src;
    }
  });
  if (bestImg && bestScore > 5000) return bestImg;

  // Estrategia 4: buscar en JSON-LD
  const jsonLd = $('script[type="application/ld+json"]').text();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      const img = data.image || data.thumbnailUrl || (data['@graph'] && data['@graph'][0]?.image);
      if (img && typeof img === 'string') return img;
    } catch {}
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎨 Enriquecimiento de portadas desde Whakoom');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('🔍 MODO DRY-RUN — no se descargará nada\n');

  // Obtener cómics a procesar
  const query = FORCE
    ? 'SELECT id, wkid, title, url FROM comics WHERE url IS NOT NULL ORDER BY id ASC LIMIT ?'
    : 'SELECT id, wkid, title, url FROM comics WHERE url IS NOT NULL AND cover_local IS NULL AND cover_url IS NULL ORDER BY id ASC LIMIT ?';

  const result = await db.execute({ sql: query, args: [LIMIT] });
  const comics = result.rows;

  console.log(`📚 Cómics a procesar: ${comics.length}`);
  if (FORCE) console.log('⚡ Modo --force: reprocesando aunque ya tengan portada');
  console.log('');

  let ok = 0, skipped = 0, errors = 0;

  for (let i = 0; i < comics.length; i++) {
    const comic = comics[i];
    const { id, wkid, title, url } = comic;
    const label = `[${i + 1}/${comics.length}] ${title ?? `wkid:${wkid}`}`;

    process.stdout.write(`  ${label} … `);

    if (DRY_RUN) {
      console.log(`→ ${url}`);
      continue;
    }

    try {
      // 1. Descargar página
      const html = await fetchHtml(url);

      // 2. Extraer URL de portada
      const coverUrl = extractCoverUrl(html, url);
      if (!coverUrl) {
        console.log('⚠️  no encontrada');
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // 3. Descargar imagen
      const ext = coverUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? 'jpg';
      const filename = `${wkid}.${ext}`;
      const destPath = path.join(COVERS_DIR, filename);

      await downloadImage(coverUrl, destPath);

      // Verificar que la imagen tiene tamaño razonable (> 2KB)
      const stat = fs.statSync(destPath);
      if (stat.size < 2000) {
        fs.unlinkSync(destPath);
        console.log('⚠️  imagen demasiado pequeña, descartada');
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // 4. Actualizar base de datos
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

    // Pausa entre peticiones
    await sleep(DELAY_MS);
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`✅ Descargadas:  ${ok}`);
  console.log(`⚠️  Sin portada:  ${skipped}`);
  console.log(`❌ Errores:      ${errors}`);
  console.log(`📁 Portadas en:  public/covers/`);

  if (ok > 0) {
    console.log('\n💡 Reinicia el servidor (npm run dev) para ver las portadas.');
  }
}

main().catch(console.error);
