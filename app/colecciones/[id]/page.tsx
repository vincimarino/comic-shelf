import { getSeriesById, getComicsBySeries, displayTitle, displayCover } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import BookCover from '@/components/BookCover';
import BackButton from '@/components/BackButton';
import SeriesComicsGrid from '@/components/SeriesComicsGrid';

export const revalidate = 0;

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) notFound();

  const [series, comics] = await Promise.all([
    getSeriesById(seriesId),
    getComicsBySeries(seriesId),
  ]);

  if (!series) notFound();

  // Si solo hay 1 cómic, ir directo a su ficha
  if (comics.length === 1) {
    redirect(`/colecciones/${seriesId}/comic/${comics[0].id}`);
  }

  const cover = series.cover_url ?? (comics[0] ? displayCover(comics[0]) : null);
  const pct = series.total_issues ? Math.round((series.comic_count / series.total_issues) * 100) : null;

  return (
    <div style={{ background: '#0e0804', minHeight: '100vh' }}>

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3 flex items-center gap-3">
        <BackButton fallback="/colecciones" />
        <div className="font-sans text-xs" style={{ color: '#3d2510' }}>
          <Link href="/colecciones" style={{ color: '#4a2e14' }}>Colecciones</Link>
          <span className="mx-1">›</span>
          <span style={{ color: '#8b6a3a' }}>{series.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="flex gap-6 md:gap-8 items-start rounded-xl p-5 md:p-7" style={{ background: '#130b04', border: '1px solid #2c1a0e' }}>
          <div className="book-shadow flex-shrink-0" style={{ width: 'clamp(110px, 11vw, 160px)', height: 'clamp(165px, 16.5vw, 240px)', borderRadius: 7, overflow: 'hidden' }}>
            <BookCover src={cover} alt={series.name} width={160} height={240} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="font-serif font-bold leading-tight" style={{ fontSize: 'clamp(20px, 3.5vw, 38px)', color: '#d4a96a' }}>
              {series.name}
            </h1>
            {series.publisher && (
              <p className="font-sans mt-1.5" style={{ fontSize: 'clamp(12px, 1.2vw, 15px)', color: '#6b4c2a' }}>{series.publisher}</p>
            )}
            <div className="mt-4" style={{ maxWidth: 320 }}>
              {series.total_issues ? (
                <>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-sans font-semibold" style={{ fontSize: 'clamp(13px, 1.3vw, 16px)', color: '#d4a96a' }}>
                      {series.comic_count} / {series.total_issues} tomos
                    </span>
                    <span className="font-sans text-xs" style={{ color: pct === 100 ? '#4ade80' : '#f59e0b' }}>
                      {pct === 100 ? '✓ Completa' : `${pct}%`}
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#2c1a0e', borderRadius: 2 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </>
              ) : (
                <span className="font-sans" style={{ fontSize: 'clamp(13px, 1.3vw, 16px)', color: '#d4a96a' }}>
                  {series.comic_count} tomos en colección
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <SeriesComicsGrid comics={comics} seriesId={seriesId} />

      <div className="max-w-6xl mx-auto px-4 pt-2">
        <div className="shelf-plank" style={{ borderRadius: '2px' }} />
      </div>
      <div style={{ height: 48, background: '#0e0804' }} />
    </div>
  );
}
