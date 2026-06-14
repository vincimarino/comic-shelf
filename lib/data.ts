import { createClient } from '@libsql/client';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'comics.db');

function getDb() {
  return createClient({ url: `file:${DB_PATH}` });
}

export type Series = {
  id: number;
  name: string;
  publisher: string | null;
  description: string | null;
  total_issues: number | null;
  cover_url: string | null;
  comic_count: number;
  first_cover: string | null;
};

export type Comic = {
  id: number;
  wkid: number | null;
  series_id: number;
  series_name: string;
  edition: string | null;
  number: number | null;
  title: string | null;
  publisher: string | null;
  language: string | null;
  release_date: string | null;
  url: string | null;
  cover_url: string | null;
  cover_local: string | null;
  synopsis: string | null;
  authors: string | null;
  isbn: string | null;
  pages: number | null;
  grade: string | null;
  place: string | null;
  notes: string | null;
  readed: number;
};

export function displayTitle(c: Comic | { title: string | null; number: number | null; series_name?: string }): string {
  if (c.title && c.title !== 'nan') return c.title;
  if (c.number !== null && c.number !== undefined) return `Nº ${c.number}`;
  if ('series_name' in c && c.series_name) return c.series_name;
  return 'Sin título';
}

export function displayCover(c: { cover_local: string | null; cover_url: string | null } | null): string | null {
  if (!c) return null;
  if (c.cover_local) return `/covers/${c.cover_local}`;
  if (c.cover_url) return c.cover_url;
  return null;
}

export async function getAllSeries(): Promise<Series[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT
      s.id, s.name, s.publisher, s.description, s.total_issues, s.cover_url,
      COUNT(c.id) as comic_count,
      (SELECT c2.cover_url FROM comics c2
       WHERE c2.series_id = s.id AND c2.cover_url IS NOT NULL
       ORDER BY c2.number ASC NULLS LAST LIMIT 1) as first_cover
    FROM series s
    LEFT JOIN comics c ON c.series_id = s.id
    GROUP BY s.id
    ORDER BY s.name ASC
  `);
  return result.rows as unknown as Series[];
}

export async function getSeriesById(id: number): Promise<Series | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT
        s.id, s.name, s.publisher, s.description, s.total_issues, s.cover_url,
        COUNT(c.id) as comic_count,
        (SELECT c2.cover_url FROM comics c2
         WHERE c2.series_id = s.id AND c2.cover_url IS NOT NULL
         ORDER BY c2.number ASC NULLS LAST LIMIT 1) as first_cover
      FROM series s
      LEFT JOIN comics c ON c.series_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as Series;
}

export async function getComicsBySeries(seriesId: number): Promise<Comic[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT c.*, s.name as series_name
      FROM comics c
      JOIN series s ON s.id = c.series_id
      WHERE c.series_id = ?
      ORDER BY c.number ASC NULLS LAST, c.release_date ASC, c.id ASC
    `,
    args: [seriesId],
  });
  return result.rows as unknown as Comic[];
}

export async function getComicById(id: number): Promise<Comic | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT c.*, s.name as series_name
      FROM comics c
      JOIN series s ON s.id = c.series_id
      WHERE c.id = ?
    `,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as Comic;
}

export async function searchComics(q: string): Promise<Comic[]> {
  const db = getDb();
  const like = `%${q}%`;
  const result = await db.execute({
    sql: `
      SELECT c.*, s.name as series_name
      FROM comics c
      JOIN series s ON s.id = c.series_id
      WHERE s.name LIKE ? OR c.title LIKE ? OR c.publisher LIKE ?
      ORDER BY s.name ASC, c.number ASC NULLS LAST
      LIMIT 60
    `,
    args: [like, like, like],
  });
  return result.rows as unknown as Comic[];
}

export async function getAdjacentComics(comicId: number, seriesId: number, number: number | null): Promise<{ prev: Comic | null; next: Comic | null }> {
  const db = getDb();
  const siblings = await db.execute({
    sql: `SELECT id, number FROM comics WHERE series_id = ? ORDER BY number ASC NULLS LAST, id ASC`,
    args: [seriesId],
  });
  const rows = siblings.rows;
  const idx = rows.findIndex((r) => Number(r.id) === comicId);
  const prevRow = idx > 0 ? rows[idx - 1] : null;
  const nextRow = idx < rows.length - 1 ? rows[idx + 1] : null;

  const fetchComic = async (id: number) => {
    const r = await db.execute({ sql: `SELECT c.*, s.name as series_name FROM comics c JOIN series s ON s.id=c.series_id WHERE c.id=?`, args: [id] });
    return r.rows[0] as unknown as Comic ?? null;
  };

  return {
    prev: prevRow ? await fetchComic(Number(prevRow.id)) : null,
    next: nextRow ? await fetchComic(Number(nextRow.id)) : null,
  };
}

export async function getStats() {
  const db = getDb();
  const comics = await db.execute('SELECT COUNT(*) as c FROM comics');
  const series = await db.execute('SELECT COUNT(*) as c FROM series');
  const publishers = await db.execute('SELECT COUNT(DISTINCT publisher) as c FROM comics WHERE publisher IS NOT NULL');
  const withCover = await db.execute('SELECT COUNT(*) as c FROM comics WHERE cover_url IS NOT NULL OR cover_local IS NOT NULL');
  return {
    comics: Number(comics.rows[0].c),
    series: Number(series.rows[0].c),
    publishers: Number(publishers.rows[0].c),
    withCover: Number(withCover.rows[0].c),
  };
}
