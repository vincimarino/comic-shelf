'use client';
import Link from 'next/link';

export default function BackButton({ fallback }: { fallback: string }) {
  return (
    <Link
      href={fallback}
      className="flex items-center gap-2 font-sans flex-shrink-0"
      style={{ color: '#6b4c2a', fontSize: 13, textDecoration: 'none' }}
    >
      <span
        style={{
          width: 36, height: 36,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid #2c1a0e',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </span>
      <span className="hidden sm:inline" style={{ color: '#4a2e14' }}>Volver</span>
    </Link>
  );
}
