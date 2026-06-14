'use client';
import { useState } from 'react';
import Link from 'next/link';
import BookCover from './BookCover';
import EditCoverButton from './EditCoverButton';
import { displayTitle } from '@/lib/data';
import type { Comic } from '@/lib/data';

interface Props {
  comic: Comic;
  initialCover: string | null;
  title: string;
  authors: { role: string; name: string }[];
  prev: Comic | null;
  next: Comic | null;
  seriesId: number;
}

export default function ComicDetailClient({ comic, initialCover, title, authors, prev, next, seriesId }: Props) {
  const [cover, setCover] = useState(initialCover);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="md:grid md:grid-cols-[auto_1fr] md:gap-10 md:items-start">

        {/* Columna izquierda: portada + lápiz + link Whakoom */}
        <div className="flex flex-col items-center gap-3 mb-6 md:mb-0">
          {/* Portada con lápiz encima */}
          <div style={{ position: 'relative', width: 'clamp(160px, 22vw, 260px)' }}>
            <div
              className="book-shadow-lg"
              style={{ width: '100%', height: 'clamp(240px, 33vw, 390px)', borderRadius: 7, overflow: 'hidden' }}
            >
              <BookCover
                src={cover}
                alt={title}
                width={260} height={390}
                priority
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* Lápiz esquina superior derecha */}
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <EditCoverButton
                comicId={comic.id}
                currentCover={cover}
                title={title}
                onUpdated={(p) => setCover(p + '?t=' + Date.now())}
              />
            </div>
          </div>

          {comic.url && (
            <a
              href={comic.url} target="_blank" rel="noopener noreferrer"
              className="font-sans text-xs px-4 py-2 rounded-lg text-center"
              style={{ background: '#1a0e06', border: '1px solid #2c1a0e', color: '#4a2e14', width: 'clamp(160px, 22vw, 260px)' }}
            >
              ↗ Ver en Whakoom
            </a>
          )}
        </div>

        {/* Columna derecha: info */}
        <div className="pt-1">
          <div className="font-sans font-semibold uppercase tracking-widest" style={{ fontSize: 11, color: '#f59e0b' }}>
            {comic.series_name}
          </div>
          <h1 className="font-serif font-bold leading-tight mt-1.5" style={{ fontSize: 'clamp(20px, 3vw, 34px)', color: '#d4a96a' }}>
            {title}
          </h1>
          <p className="font-sans mt-1" style={{ fontSize: 'clamp(12px, 1.1vw, 14px)', color: '#6b4c2a' }}>
            {comic.number !== null ? `Tomo #${comic.number}` : 'Obra única'}
            {comic.release_date ? ` · ${comic.release_date}` : ''}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {[comic.publisher, comic.language, comic.edition].filter(Boolean).map((t, i) => (
              <span key={i} className="font-sans px-3 py-1 rounded" style={{ background: '#1a0e06', border: '1px solid #2c1a0e', color: '#6b4c2a', fontSize: 12 }}>{t}</span>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex gap-2 mt-5">
            {prev ? (
              <Link href={`/colecciones/${seriesId}/comic/${prev.id}`} className="font-sans flex-1 text-center py-2.5 rounded-lg truncate" style={{ background: '#1a0e06', border: '1px solid #2c1a0e', color: '#6b4c2a', fontSize: 12 }}>
                ← {displayTitle(prev)}
              </Link>
            ) : <div className="flex-1" />}
            {next && (
              <Link href={`/colecciones/${seriesId}/comic/${next.id}`} className="font-sans flex-1 text-center py-2.5 rounded-lg truncate" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #78350f', color: '#f59e0b', fontSize: 12 }}>
                {displayTitle(next)} →
              </Link>
            )}
          </div>

          <div style={{ height: 1, background: '#2c1a0e', margin: '20px 0' }} />

          {comic.synopsis && (
            <div className="mb-5">
              <div className="font-sans font-semibold uppercase tracking-widest mb-2" style={{ fontSize: 10, color: '#3d2510' }}>Sinopsis</div>
              <p className="font-sans leading-relaxed" style={{ fontSize: 'clamp(12px, 1.1vw, 14px)', color: '#8b6a3a' }}>{comic.synopsis}</p>
            </div>
          )}

          {(authors.length > 0 || comic.isbn || comic.pages) && (
            <div className="mb-5">
              <div className="font-sans font-semibold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: '#3d2510' }}>Datos</div>
              {authors.map((a, i) => <DataRow key={i} label={a.role} value={a.name} />)}
              {comic.isbn   && <DataRow label="ISBN"    value={comic.isbn} />}
              {comic.pages  && <DataRow label="Páginas" value={String(comic.pages)} />}
              {comic.edition && <DataRow label="Formato" value={comic.edition} />}
            </div>
          )}

          <div>
            <div className="font-sans font-semibold uppercase tracking-widest mb-2" style={{ fontSize: 10, color: '#3d2510' }}>Mis notas</div>
            <p className="font-sans" style={{ fontSize: 'clamp(12px, 1.1vw, 14px)', color: comic.notes ? '#8b6a3a' : '#3d2510', fontStyle: comic.notes ? 'normal' : 'italic' }}>
              {comic.notes ?? 'Sin notas.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2" style={{ borderBottom: '1px solid #1a0e06' }}>
      <span className="font-sans" style={{ fontSize: 13, color: '#4a2e14' }}>{label}</span>
      <span className="font-sans" style={{ fontSize: 13, color: '#a07840', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
