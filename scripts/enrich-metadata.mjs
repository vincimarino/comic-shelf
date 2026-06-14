#!/usr/bin/env node
/**
 * Enriquecimiento de metadatos desde Whakoom
 * Uso:
 *   node scripts/enrich-metadata.mjs               → todos sin sinopsis
 *   node scripts/enrich-metadata.mjs --limit 20
 *   node scripts/enrich-metadata.mjs --force       → reprocesa todos
 *   node scripts/enrich-metadata.mjs --dry-run
 */

import { createClient } from '@libsql/client';
import { createRequire } from 'module';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const require   = createRequire(import.meta.url);
const cheerio   = require('cheerio');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'comics.db');
const db        = createClient({ url: `file:${DB_PATH}` });

const args    = process.argv.slice(2);
const LIMIT   = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 9999;
const FORCE   = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const DELAY   = 1500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchHtml(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Demasiadas redirecciones'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://www.whakoom.com${res.headers.location}`;
        return fetchHtml(next, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject)
      .setTimeout(20000, function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

function extractMetadata(html) {
  const $ = cheerio.load(html);
  const data = {};

  // ── Sinopsis: párrafos dentro de .wiki-text (excluir el h3) ──
  const synParagraphs = [];
  $('.wiki-text p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10) synParagraphs.push(text);
  });
  if (synParagraphs.length > 0) {
    data.synopsis = synParagraphs.join('\n\n').slice(0, 3000);
  }

  // ── Autores: cada <a itemprop="name"> + texto siguiente para el rol ──
  const authors = [];
  const authorsHtml = $('.authors p').html() || '';
  // Parsear "Nombre (Rol), Nombre2 (Rol2)"
  // El HTML tiene: <a>Nombre</a> (Rol), <a>Nombre2</a> (Rol2)
  $('.authors p a[itemprop="url"]').each((_, el) => {
    const name = $(el).find('[itemprop="name"]').text().trim() || $(el).text().trim();
    if (!name) return;
    // El rol está en el texto después del </a>, antes de la siguiente coma
    const nodeHtml = $.html(el);
    const afterLink = authorsHtml.slice(authorsHtml.indexOf(nodeHtml) + nodeHtml.length);
    const roleMatch = afterLink.match(/^\s*\(([^)]+)\)/);
    const role = roleMatch ? roleMatch[1].trim() : '';
    authors.push({ name, role: role || 'Autor' });
  });
  if (authors.length > 0) data.authors = JSON.stringify(authors);

  // ── ISBN ──
  const isbn = $('li[itemprop="isbn"]').first().text().trim();
  if (isbn) data.isbn = isbn;

  // ── Fecha de publicación ──
  const fecha = $('p[itemprop="datePublished"]').text().trim();
  if (fecha) data.release_date = fecha;

  // ── Páginas / Formato ──
  const formato = $('p.format').first().text().trim();
  if (formato) {
    data.edition = formato;
    const pagesMatch = formato.match(/(\d{2,4})\s*pp/i);
    if (pagesMatch) data.pages = parseInt(pagesMatch[1]);
  }

  // ── Portada en alta resolución ──
  const coverHref = $('p.comic-cover a.fancybox').attr('href');
  if (coverHref && coverHref.includes('whakoom.com')) data.cover_hd = coverHref;

  return data;
}

async function ensureColumns() {
  const cols = await db.execute('PRAGMA table_info(comics)');
  const names = cols.rows.map(r => r.name);
  const toAdd = ['synopsis', 'authors', 'isbn', 'pages', 'enriched_at'];
  for (const col of toAdd) {
    if (!names.includes(col)) {
      const type = col === 'pages' ? 'INTEGER' : 'TEXT';
      await db.execute(`ALTER TABLE comics ADD COLUMN ${col} ${type}`);
    }
  }
}

async function main() {
  console.log('\n📖 Enriquecimiento de metadatos desde Whakoom');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('🔍 MODO DRY-RUN\n');

  await ensureColumns();

  const sql = FORCE
    ? `SELECT c.id, c.wkid, c.title, c.number, c.url, s.name as series_name
       FROM comics c JOIN series s ON s.id=c.series_id
       WHERE c.url IS NOT NULL ORDER BY c.id LIMIT ?`
    : `SELECT c.id, c.wkid, c.title, c.number, c.url, s.name as series_name
       FROM comics c JOIN series s ON s.id=c.series_id
       WHERE c.url IS NOT NULL AND (c.synopsis IS NULL OR c.synopsis = '')
       ORDER BY c.id LIMIT ?`;

  const { rows } = await db.execute({ sql, args: [LIMIT] });
  console.log(`📚 Cómics a procesar: ${rows.length}\n`);

  let ok = 0, skipped = 0, errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, title, number, url, series_name } = rows[i];
    const label = `[${i+1}/${rows.length}] ${series_name}${number ? ' #'+number : ''} — ${title ?? ''}`.slice(0, 70);
    process.stdout.write(`  ${label}\n    → `);

    if (DRY_RUN) { console.log(url); continue; }

    try {
      const html = await fetchHtml(url);
      const meta = extractMetadata(html);

      const updates = [];
      const vals = [];

      if (meta.synopsis)     { updates.push('synopsis = ?');     vals.push(meta.synopsis); }
      if (meta.authors)      { updates.push('authors = ?');      vals.push(meta.authors); }
      if (meta.isbn)         { updates.push('isbn = ?');         vals.push(meta.isbn); }
      if (meta.pages)        { updates.push('pages = ?');        vals.push(meta.pages); }
      if (meta.release_date) { updates.push('release_date = ?'); vals.push(meta.release_date); }
      if (meta.edition)      { updates.push('edition = ?');      vals.push(meta.edition); }

      updates.push("enriched_at = datetime('now')");
      updates.push("updated_at  = datetime('now')");
      vals.push(id);

      await db.execute({ sql: `UPDATE comics SET ${updates.join(', ')} WHERE id = ?`, args: vals });

      const found = [
        meta.synopsis     ? '📝 sinopsis'           : '',
        meta.authors      ? '👤 autores'            : '',
        meta.isbn         ? '📕 isbn'               : '',
        meta.pages        ? `📄 ${meta.pages}pp`    : '',
        meta.release_date ? `📅 ${meta.release_date}` : '',
      ].filter(Boolean);

      if (found.length) { console.log(`✅ ${found.join(', ')}`); ok++; }
      else              { console.log(`⚠️  sin datos extraíbles`); skipped++; }

    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }

    await sleep(DELAY);
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`✅ Con datos:     ${ok}`);
  console.log(`⚠️  Sin datos:     ${skipped}`);
  console.log(`❌ Errores:       ${errors}`);
  console.log('\n💡 Reinicia el servidor para ver los cambios.\n');
}

main().catch(console.error);
