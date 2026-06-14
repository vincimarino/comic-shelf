'use client';
import { useState } from 'react';
import Link from 'next/link';
import ShelfRow from './ShelfRow';
import BookCover from './BookCover';
import MobileGrid from './MobileGrid';
import type { Series } from '@/lib/data';

const SHELF_SIZE = 8;

function getLabel(row: Series[]): string {
  const first = row[0]?.name?.[0]?.toUpperCase() ?? '';
  const last  = row[row.length - 1]?.name?.[0]?.toUpperCase() ?? '';
  return first === last ? first : first + ' — ' + last;
}

export default function HomeShelf({ allSeries }: { allSeries: Series[] }) {
  const [view, setView] = useState<'shelf' | 'list'>('shelf');

  const rows: Series[][] = [];
  for (let i = 0; i < allSeries.length; i += SHELF_SIZE) {
    rows.push(allSeries.slice(i, i + SHELF_SIZE));
  }

  return (
    <div>
      {/* Toggle — solo desktop, en móvil siempre grid */}
      <div className="hidden sm:flex justify-end px-4 py-2 max-w-screen-2xl mx-auto" style={{ gap: 4 }}>
        <ViewBtn active={view === 'shelf'} onClick={() => setView('shelf')} title="Estantería">
          <ShelfIcon />
        </ViewBtn>
        <ViewBtn active={view === 'list'} onClick={() => setView('list')} title="Lista">
          <ListIcon />
        </ViewBtn>
      </div>

      {/* MÓVIL: grid 3 columnas */}
      <div className="sm:hidden">
        <MobileGrid allSeries={allSeries} />
      </div>

      {/* DESKTOP: estantería */}
      {view === 'shelf' && (
        <div className="hidden sm:block" style={{ background: '#130b04' }}>
          <div style={{ height: 6, background: '#0e0804' }} />
          <div className="max-w-screen-2xl mx-auto">
            {rows.map((row, i) => (
              <ShelfRow key={i} seriesList={row} label={getLabel(row)} />
            ))}
          </div>
          <div style={{ height: 32, background: '#0e0804' }} />
        </div>
      )}

      {/* DESKTOP: lista */}
      {view === 'list' && (
        <div className="hidden sm:block">
          <div className="max-w-screen-2xl mx-auto px-4 py-4 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {allSeries.map(series => (
              <Link
                key={series.id}
                href={`/colecciones/${series.id}`}
                className="flex items-center gap-4 rounded-lg p-3"
                style={{ background: '#1a0e06', border: '1px solid #2c1a0e', textDecoration: 'none' }}
              >
                <div style={{ width: 40, height: 58, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                  <BookCover src={series.first_cover ?? series.cover_url} alt={series.name} width={40} height={58} style={{ borderRadius: 3 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-sm font-semibold truncate" style={{ color: '#d4a96a' }}>{series.name}</div>
                  <div className="font-sans text-xs mt-0.5 truncate" style={{ color: '#6b4c2a' }}>{series.publisher ?? '—'}</div>
                </div>
                <div className="font-sans text-xs flex-shrink-0 px-2 py-1 rounded" style={{ background: '#2c1a0e', color: '#6b4c2a' }}>
                  {series.comic_count}t
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#2c1a0e' : 'transparent',
        color: active ? '#d4a96a' : '#4a2e14',
        border: `1px solid ${active ? '#3d2510' : 'transparent'}`,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ShelfIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="4" height="16" rx="1"/><rect x="7" y="6" width="3" height="14" rx="1"/><rect x="11" y="5" width="5" height="15" rx="1"/><rect x="17" y="7" width="5" height="13" rx="1"/></svg>;
}
function ListIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round"/><line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round"/><line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>;
}
