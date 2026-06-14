'use client';
import { useState } from 'react';

interface Props {
  comicId: number;
  currentCover: string | null;
  title: string;
  onUpdated: (newPath: string) => void;
}

export default function EditCoverButton({ comicId, currentCover, title, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId, imageUrl: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
      setSuccess(true);
      onUpdated(data.path + '?t=' + Date.now());
      setTimeout(() => { setOpen(false); setUrl(''); setSuccess(false); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Lápiz — siempre visible */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        title="Cambiar portada"
        style={{
          width: 24, height: 24,
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid #3d2510',
          borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4a96a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: '#1a0e06', border: '1px solid #3d2510', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold mb-1" style={{ color: '#d4a96a', fontSize: 16 }}>Cambiar portada</h3>
            <p className="font-sans mb-4" style={{ color: '#6b4c2a', fontSize: 12 }}>{title}</p>

            {currentCover && (
              <div className="mb-4 flex items-center gap-3">
                <img src={currentCover} alt="actual" style={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 4, border: '1px solid #2c1a0e' }} />
                <span className="font-sans text-xs" style={{ color: '#4a2e14' }}>Portada actual</span>
              </div>
            )}

            <label className="font-sans block mb-1" style={{ fontSize: 11, color: '#6b4c2a' }}>URL de la nueva imagen</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="search-input mb-2"
              style={{ paddingLeft: 12, marginBottom: 8 }}
              autoFocus
            />
            <p className="font-sans mb-4" style={{ fontSize: 10, color: '#3d2510' }}>
              Clic derecho en cualquier imagen → "Copiar dirección de imagen" → pégala aquí
            </p>

            {error && <div className="font-sans mb-3 px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid #7f1d1d', color: '#fca5a5', fontSize: 12 }}>❌ {error}</div>}
            {success && <div className="font-sans mb-3 px-3 py-2 rounded" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid #14532d', color: '#4ade80', fontSize: 12 }}>✅ Portada actualizada</div>}

            <div className="flex gap-2">
              <button onClick={() => { setOpen(false); setUrl(''); setError(''); }} className="font-sans flex-1 py-2 rounded-lg text-sm" style={{ background: '#130b04', border: '1px solid #2c1a0e', color: '#6b4c2a' }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !url.trim()}
                className="font-sans flex-1 py-2 rounded-lg text-sm"
                style={{ background: loading || !url.trim() ? '#2c1a0e' : 'rgba(245,158,11,0.15)', border: '1px solid ' + (loading || !url.trim() ? '#2c1a0e' : '#78350f'), color: loading || !url.trim() ? '#4a2e14' : '#f59e0b', cursor: loading || !url.trim() ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
