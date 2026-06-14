import { createClient } from '@libsql/client';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'comics.db');

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({ url: `file:${DB_PATH}` });
  }
  return client;
}

export async function initDb() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS series (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      publisher   TEXT,
      description TEXT,
      total_issues INTEGER,
      cover_url   TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
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
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_series_name ON series(name)`);
}

export type Series = {
  id: number;
  name: string;
  publisher: string | null;
  description: string | null;
  total_issues: number | null;
  cover_url: string | null;
  comic_count?: number;
};

export type Comic = {
  id: number;
  wkid: number | null;
  series_id: number;
  series_name?: string;
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

export function displayTitle(comic: Comic): string {
  if (comic.title && comic.title !== 'nan') return comic.title;
  if (comic.number !== null) return `#${comic.number}`;
  return 'Sin título';
}

export function displayCover(comic: Comic): string | null {
  if (comic.cover_local) return `/covers/${comic.cover_local}`;
  if (comic.cover_url) return comic.cover_url;
  return null;
}
