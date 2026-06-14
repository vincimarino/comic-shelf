'use client';
import Link from 'next/link';
import BookCover from './BookCover';
import type { Series } from '@/lib/data';

export default function MobileGrid({ allSeries }: { allSeries: Series[] }) {
  const groups: Record<string, Series[]> = {};
  for (const s of allSeries) {
    const letter = s.name?.[0]?.toUpperCase() ?? '#';
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(s);
  }

  return (
    <div style={{ background: '#0e0804', paddingBottom: 24 }}>
      {Object.entries(groups).map(([letter, series]) => (
        <div key={letter}>
          <div className="font-sans px-4 pt-4 pb-2" style={{ fontSize: 10, color: '#3d2510', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #1a0e06' }}>
            {letter} · {series.length} series
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 12px 4px' }}>
            {series.map(s => (
              <Link key={s.id} href={`/colecciones/${s.id}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', boxShadow: '2px 3px 8px rgba(0,0,0,0.6)' }}>
                  <BookCover
                    src={s.first_cover ?? s.cover_url}
                    alt={s.name}
                    width={120} height={180}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.88)', color: '#ccc', fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>
                    {s.comic_count}t
                  </div>
                </div>
                {/* Nombre siempre visible — sin hover */}
                <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#6b4c2a', textAlign: 'center', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {s.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
