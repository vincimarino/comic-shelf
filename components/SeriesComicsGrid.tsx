'use client';
import { useState } from 'react';
import Link from 'next/link';
import BookCover from './BookCover';
import EditCoverButton from './EditCoverButton';
import { displayTitle, displayCover } from '@/lib/data';
import type { Comic } from '@/lib/data';

interface Props {
  comics: Comic[];
  seriesId: number;
}

export default function SeriesComicsGrid({ comics, seriesId }: Props) {
  const [coverOverrides, setCoverOverrides] = useState<Record<number, string>>({});

  return (
    <div className="max-w-6xl mx-auto px-4 pb-6">
      <div
        className="grid gap-3 md:gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(80px, 8vw, 120px), 1fr))' }}
      >
        {comics.map((comic) => {
          const title = displayTitle(comic);
          const baseCover = displayCover(comic);
          const cover = coverOverrides[comic.id] ?? baseCover;

          return (
            <div
              key={comic.id}
              className="comic-card-wrap flex flex-col"
              style={{ position: 'relative' }}
            >
              {/* Portada + link */}
              <Link href={`/colecciones/${seriesId}/comic/${comic.id}`} className="flex flex-col">
                <div
                  className="book-hover book-shadow"
                  style={{ borderRadius: 5, overflow: 'hidden', aspectRatio: '2/3', width: '100%', position: 'relative' }}
                >
                  <BookCover
                    src={cover}
                    alt={title}
                    width={120} height={180}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {comic.number !== null && (
                    <div style={{
                      position: 'absolute', bottom: 5, left: 5,
                      background: 'rgba(0,0,0,0.88)',
                      color: '#ccc', fontSize: 10,
                      fontFamily: 'sans-serif', fontWeight: 700,
                      padding: '2px 5px', borderRadius: 3,
                    }}>
                      #{comic.number}
                    </div>
                  )}
                </div>
                <div
                  className="font-sans mt-1 text-center leading-tight"
                  style={{ fontSize: 'clamp(9px, 0.8vw, 11px)', color: '#4a2e14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {title}
                </div>
              </Link>

              {/* Lápiz — fuera del Link, esquina superior derecha */}
              <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 20 }}>
                <EditCoverButton
                  comicId={comic.id}
                  currentCover={cover}
                  title={title}
                  onUpdated={(newPath) => setCoverOverrides(prev => ({ ...prev, [comic.id]: newPath }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
