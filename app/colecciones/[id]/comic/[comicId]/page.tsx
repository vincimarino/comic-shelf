import { getComicById, getAdjacentComics, displayTitle, displayCover } from '@/lib/data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import ComicDetailClient from '@/components/ComicDetailClient';
import { getComicsBySeries } from '@/lib/data';

export const revalidate = 0;

export default async function ComicPage({ params }: { params: Promise<{ id: string; comicId: string }> }) {
  const { id, comicId } = await params;
  const seriesId = parseInt(id);
  const cId = parseInt(comicId);
  if (isNaN(seriesId) || isNaN(cId)) notFound();

  const comic = await getComicById(cId);
  if (!comic || comic.series_id !== seriesId) notFound();

  const [{ prev, next }, seriesComics] = await Promise.all([
    getAdjacentComics(cId, seriesId, comic.number),
    getComicsBySeries(seriesId),
  ]);

  const title = displayTitle(comic);
  const cover = displayCover(comic);
  const isSingleComic = seriesComics.length === 1;

  let authors: { role: string; name: string }[] = [];
  try { if (comic.authors) authors = JSON.parse(comic.authors); } catch {}

  return (
    <div style={{ background: '#0e0804', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2 flex items-center gap-3">
        {/* Si es serie de 1 cómic, volver a colecciones directamente */}
        <BackButton fallback={isSingleComic ? '/colecciones' : `/colecciones/${seriesId}`} />
        <div className="font-sans text-xs min-w-0 truncate" style={{ color: '#3d2510' }}>
          <Link href="/colecciones" style={{ color: '#4a2e14' }}>Colecciones</Link>
          <span className="mx-1">›</span>
          <Link href={`/colecciones/${seriesId}`} style={{ color: '#4a2e14' }}>{comic.series_name}</Link>
          {!isSingleComic && (
            <>
              <span className="mx-1">›</span>
              <span style={{ color: '#8b6a3a' }}>{title}</span>
            </>
          )}
        </div>
      </div>

      <ComicDetailClient
        comic={comic}
        initialCover={cover}
        title={title}
        authors={authors}
        prev={prev}
        next={next}
        seriesId={seriesId}
      />
    </div>
  );
}
