#!/usr/bin/env node
/**
 * Sincroniza las portadas que ya existen en public/covers/ con la base de datos.
 * No descarga nada — solo actualiza los registros en la DB para que apunten
 * a los archivos que ya tienes.
 *
 * Uso: node scripts/sync-covers.mjs
 */

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, '..', 'comics.db');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');

const db = createClient({ url: `file:${DB_PATH}` });

async function main() {
  console.log('\n🔄 Sincronizando portadas existentes con la base de datos...\n');

  if (!fs.existsSync(COVERS_DIR)) {
    console.error('❌ No existe la carpeta public/covers/');
    process.exit(1);
  }

  // Leer todos los archivos de imagen en la carpeta
  const files = fs.readdirSync(COVERS_DIR).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  console.log(`📁 Archivos encontrados en public/covers/: ${files.length}\n`);

  let updated = 0;
  let notFound = 0;

  for (const file of files) {
    // El nombre del archivo es {wkid}.ext
    const wkid = parseInt(path.basename(file, path.extname(file)));
    if (isNaN(wkid)) continue;

    const result = await db.execute({
      sql: `UPDATE comics SET cover_local = ?, updated_at = datetime('now') WHERE wkid = ? AND cover_local IS NULL`,
      args: [file, wkid],
    });

    if (result.rowsAffected > 0) {
      updated++;
    } else {
      // Ya tenía portada o wkid no existe
      notFound++;
    }
  }

  console.log(`✅ Registros actualizados: ${updated}`);
  console.log(`⏭️  Ya tenían portada o no encontrados: ${notFound}`);
  console.log('\n💡 Reinicia el servidor (npm run dev) para ver los cambios.\n');
}

main().catch(console.error);
