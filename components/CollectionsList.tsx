'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import ShelfRow from './ShelfRow';
import BookCover from './BookCover';
import type { Series } from '@/lib/data';
import BackButton from './BackButton';

const SHELF_SIZE = 8;

function getLabel(row: Series[]): string {
  const first = row[0]?.name?.[0]?.toUpperCase() ?? '';
  const last  = row[row.length - 1]?.name?.[0]?.toUpperCase() ?? '';
  return first === last ? first : first + ' — ' + last;
}

type Props = { allSeries: Series[] };

export default function CollectionsList({ allSeries }: Props) {
  const [view, setView] = useState<'shelf' | 'list'>('shelf');
  const [filter, setFilter] = useState('');

  const publishers = useMemo(() => {
    const set = new Set(allSeries.map(s => s.publisher).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allSeries]);

  const filtered = useMemo(() => {
    if (!filter) return allSeries;
    return allSeries.filter(s => s.publisher === filter);
  }, [allSeries, filter]);

  const filteredRows: Series[][] = [];
  for (let i = 0; i < filtered.length; i += SHELF_SIZE) {
    filteredRows.push(filtered.slice(i, i + SHELF_SIZE));
  }

  // Mobile: group by letter
  const mobileGroups = useMemo(() => {
    const groups: Record<string, Series[]> = {};
    for (const s of filtered) {
      const letter = s.name?.[0]?.toUpperCase() ?? '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(s);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-4 pb-2 flex items-center gap-3">
        <BackButton fallback="/" />
        <div>
          <h1 className="font-serif font-bold" style={{ fontSize: 'clamp(18px, 3vw, 28px)', color: '#d4a96a' }}>
            Colecciones
          </h1>
          <p className="font-sans text-xs" style={{ color: '#4a2e14' }}>
            {allSeries.length} series en la colección
          </p>
        </div>
      </div>

      {/* Toolbar — visible en ambos */}
      <div style={{ position: 'sticky', top: 48, zIndex: 49, width: '100%', background: '#130b04', borderBottom: '1px solid #2c1a0e' }}>
        <div className="max-w-screen-2xl mx-auto" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setFilter('')} className="font-sans flex-shrink-0 px-3 py-1 rounded-full text-xs" style={filter === '' ? activePill : inactivePill}>
            Todas
          </button>
          {publishers.slice(0, 6).map(pub => (
            <button key={pub} onClick={() => setFilter(filter === pub ? '' : pub)} className="font-sans flex-shrink-0 px-3 py-1 rounded-full text-xs whitespace-nowrap" style={filter === pub ? activePill : inactivePill}>
              {shortPub(pub)}
            </button>
          ))}
          {/* View toggle — solo desktop */}
          <div className="ml-auto hidden sm:flex gap-1 flex-shrink-0">
            <ViewBtn active={view === 'shelf'} onClick={() => setView('shelf')} title="Estantería"><ShelfIcon /></ViewBtn>
            <ViewBtn active={view === 'list'} onClick={() => setView('list')} title="Lista"><ListIcon /></ViewBtn>
          </div>
        </div>
      </div>

      {/* MÓVIL: siempre grid 3 columnas */}
      <div className="sm:hidden" style={{ background: '#0e0804', paddingBottom: 24, overflowX: 'hidden', width: '100%' }}>
        {Object.entries(mobileGroups).map(([letter, series]) => (
          <div key={letter}>
            <div className="font-sans px-4 pt-4 pb-2" style={{ fontSize: 10, color: '#3d2510', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #1a0e06' }}>
              {letter} · {series.length} series
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 12px 4px', width: '100%', boxSizing: 'border-box' }}>
              {series.map(s => (
                <Link key={s.id} href={`/colecciones/${s.id}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textDecoration: 'none' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', boxShadow: '2px 3px 10px rgba(0,0,0,0.6)' }}>
                    <BookCover src={s.first_cover ?? s.cover_url} alt={s.name} width={120} height={180} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.88)', color: '#ccc', fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>
                      {s.comic_count}t
                    </div>
                  </div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#6b4c2a', textAlign: 'center', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {s.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 font-sans" style={{ color: '#6b4c2a' }}>No hay series con ese filtro.</div>
        )}
      </div>

      {/* DESKTOP: estantería o lista */}
      <div className="hidden sm:block">
        {view === 'shelf' && (
          <div style={{ background: '#130b04' }}>
            <div style={{ height: 8, background: '#0e0804' }} />
            <div className="max-w-screen-2xl mx-auto">
              {filteredRows.map((row, i) => <ShelfRow key={i} seriesList={row} label={getLabel(row)} />)}
              {filtered.length === 0 && <div className="text-center py-16 font-sans" style={{ color: '#6b4c2a' }}>No hay series con ese filtro.</div>}
            </div>
            <div style={{ height: 24, background: '#0e0804' }} />
          </div>
        )}
        {view === 'list' && (
          <div className="max-w-screen-2xl mx-auto px-4 py-4 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtered.map(series => (
              <Link key={series.id} href={`/colecciones/${series.id}`} className="flex items-center gap-4 rounded-lg p-3" style={{ background: '#1a0e06', border: '1px solid #2c1a0e' }}>
                <div style={{ width: 40, height: 58, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                  <BookCover src={series.first_cover ?? series.cover_url} alt={series.name} width={40} height={58} style={{ borderRadius: 3 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-sm font-semibold truncate" style={{ color: '#d4a96a' }}>{series.name}</div>
                  <div className="font-sans text-xs mt-0.5 truncate" style={{ color: '#6b4c2a' }}>{series.publisher ?? '—'}</div>
                </div>
                <div className="font-sans text-xs flex-shrink-0 px-2 py-1 rounded" style={{ background: '#2c1a0e', color: '#6b4c2a' }}>{series.comic_count}t</div>
              </Link>
            ))}
            {filtered.length === 0 && <div className="text-center py-16 font-sans col-span-full" style={{ color: '#6b4c2a' }}>No hay series con ese filtro.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

const activePill: React.CSSProperties  = { background: 'rgba(245,158,11,0.15)', border: '1px solid #78350f', color: '#f59e0b', cursor: 'pointer', minHeight: 36, display: 'flex', alignItems: 'center' };
const inactivePill: React.CSSProperties = { background: 'rgba(0,0,0,0.3)', border: '1px solid #2c1a0e', color: '#6b4c2a', cursor: 'pointer', minHeight: 36, display: 'flex', alignItems: 'center' };

function shortPub(pub: string) {
  return pub.replace('Cómic','').replace('Comics','').replace('España','').replace('Ediciones','').replace('DeAgostini','DeAg.').replace('Planeta','Planeta').trim();
}

function ViewBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="w-8 h-8 rounded flex items-center justify-center" style={{ background: active ? '#2c1a0e' : 'transparent', color: active ? '#d4a96a' : '#4a2e14', border: '1px solid ' + (active ? '#3d2510' : 'transparent') }}>
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
