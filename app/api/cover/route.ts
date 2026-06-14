import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const DB_PATH    = path.join(process.cwd(), 'comics.db');
const COVERS_DIR = path.join(process.cwd(), 'public', 'covers');

export async function POST(req: NextRequest) {
  try {
    const { comicId, imageUrl } = await req.json();

    if (!comicId || !imageUrl) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const db = createClient({ url: `file:${DB_PATH}` });

    // Get comic wkid
    const result = await db.execute({
      sql: 'SELECT id, wkid FROM comics WHERE id = ?',
      args: [comicId],
    });
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Cómic no encontrado' }, { status: 404 });
    }

    const { wkid } = result.rows[0];

    // Download image
    if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? 'jpg';
    const filename = `${wkid}.${ext}`;
    const destPath = path.join(COVERS_DIR, filename);

    // Fetch the image
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' },
    });
    if (!imgRes.ok) {
      return NextResponse.json({ error: `No se pudo descargar la imagen: HTTP ${imgRes.status}` }, { status: 400 });
    }

    const buffer = await imgRes.arrayBuffer();
    if (buffer.byteLength < 1000) {
      return NextResponse.json({ error: 'La imagen es demasiado pequeña' }, { status: 400 });
    }
    fs.writeFileSync(destPath, Buffer.from(buffer));

    // Update DB
    await db.execute({
      sql: `UPDATE comics SET cover_local = ?, cover_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [filename, imageUrl, comicId],
    });

    return NextResponse.json({ ok: true, filename, path: `/covers/${filename}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
