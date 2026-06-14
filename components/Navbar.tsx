'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); setOpen(false); setQ(''); }
  };

  return (
    <nav style={{ background: 'linear-gradient(180deg, #140c05 0%, #1a0e06 100%)', borderBottom: '1px solid #3d2510' }} className="sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center gap-3 h-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">📚</span>
          <span className="font-serif font-bold tracking-wide hidden sm:block" style={{ color: '#d4a96a', fontSize: 16 }}>
            MiColección
          </span>
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm ml-auto relative">
          <SearchIcon />
          <input className="search-input" placeholder="Buscar cómics, series, editoriales…" value={q} onChange={e => setQ(e.target.value)} />
        </form>

        {/* Móvil: botón buscar */}
        <button className="sm:hidden ml-auto p-2" style={{ color: '#6b4c2a' }} onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* Móvil: búsqueda desplegable */}
      {open && (
        <div className="sm:hidden px-4 pb-3 pt-1">
          <form onSubmit={handleSearch} className="relative">
            <SearchIcon />
            <input className="search-input" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          </form>
        </div>
      )}
    </nav>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b4c2a', pointerEvents: 'none' }}>
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
