'use client';
import Link from 'next/link';
import BookCover from './BookCover';
import type { Series } from '@/lib/data';

interface ShelfRowProps {
  seriesList: Series[];
  label?: string;
}

export default function ShelfRow({ seriesList, label }: ShelfRowProps) {
  return (
    <div>
      <div style={{ background: '#130b04', paddingTop: 6 }}>
        {label && (
          <div
            className="font-sans px-4 pb-1"
            style={{ fontSize: 10, color: '#3d2510', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {label}
          </div>
        )}
        {/* Books row — fills full width, books scale via CSS */}
        <div
          className="shelf-books-row"
          style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 16, paddingRight: 16, gap: 0, minHeight: 130 }}
        >
          {seriesList.map((series, idx) => (
            <SeriesGroup key={series.id} series={series} isFirst={idx === 0} total={seriesList.length} />
          ))}
          {/* Fill remaining space with wall texture */}
          <div style={{ flex: 1 }} />
        </div>
      </div>
      <div className="shelf-plank" />
    </div>
  );
}

function SeriesGroup({ series, isFirst, total }: { series: Series; isFirst: boolean; total: number }) {
  const count = series.comic_count;
  const cover = series.first_cover ?? series.cover_url ?? null;
  const spineCount = Math.min(count - 1, 6);

  return (
    <>
      {!isFirst && (
        <div
          className="series-sep flex-shrink-0"
          style={{ alignSelf: 'stretch' }}
        />
      )}

      <Link
        href={`/colecciones/${series.id}`}
        className="flex items-end flex-shrink-0 group book-group"
        style={{ gap: 1 }}
        title={series.name}
      >
        {/* Main cover book */}
        <div
          className="book-hover book-shadow book-main flex-shrink-0"
          style={{ borderRadius: '2px 3px 3px 2px', overflow: 'hidden', position: 'relative' }}
        >
          <BookCover
            src={cover}
            alt={series.name}
            width={120}
            height={180}
            className="book-cover-img"
            style={{ borderRadius: '2px 3px 3px 2px', display: 'block', width: '100%', height: '100%' }}
          />
          <div
            className="book-badge"
            style={{
              position: 'absolute', bottom: 5, right: 4,
              background: 'rgba(0,0,0,0.88)',
              color: '#ccc',
              fontFamily: 'sans-serif', fontWeight: 700,
              borderRadius: 3,
            }}
          >
            {count}t
          </div>
        </div>

        {/* Spine books */}
        {Array.from({ length: spineCount }).map((_, i) => (
          <div
            key={i}
            className="book-spine flex-shrink-0"
            style={{
              borderRadius: '0 2px 2px 0',
              background: spineBg(series.name, i),
              boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.5), 1px 0 1px rgba(255,255,255,0.05)',
              alignSelf: 'flex-end',
            }}
          />
        ))}
      </Link>
    </>
  );
}

function spineBg(name: string, idx: number): string {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (h * 37 + idx * 20) % 360;
  return `hsl(${hue}, 35%, ${14 + idx * 1.5}%)`;
}
