import { searchComics, displayTitle, displayCover } from '@/lib/data';
import Link from 'next/link';
import BookCover from '@/components/BookCover';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query.length >= 2 ? await searchComics(query) : [];

  return (
    <div style={{ background: '#0e0804', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        <h1 className="font-serif text-xl font-bold mb-4" style={{ color: '#d4a96a' }}>
          {query ? `Resultados para "${query}"` : 'Buscar'}
        </h1>

        {query.length >= 2 ? (
          results.length > 0 ? (
            <>
              <p className="font-sans text-xs mb-4" style={{ color: '#6b4c2a' }}>
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-col gap-2">
                {results.map(comic => {
                  const title = displayTitle(comic);
                  const cover = displayCover(comic);
                  return (
                    <Link
                      key={comic.id}
                      href={`/colecciones/${comic.series_id}/comic/${comic.id}`}
                      className="flex items-center gap-3 rounded-lg p-3 transition-colors"
                      style={{ background: '#1a0e06', border: '1px solid #2c1a0e' }}
                    >
                      <div style={{ width: 36, height: 52, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                        <BookCover src={cover} alt={title} width={36} height={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans text-xs" style={{ color: '#f59e0b' }}>{comic.series_name}</div>
                        <div className="font-serif text-sm font-semibold truncate" style={{ color: '#d4a96a' }}>{title}</div>
                        {comic.publisher && (
                          <div className="font-sans text-xs" style={{ color: '#4a2e14' }}>{comic.publisher}</div>
                        )}
                      </div>
                      {comic.number !== null && (
                        <div className="font-sans text-xs flex-shrink-0" style={{ color: '#4a2e14' }}>#{comic.number}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="font-sans text-sm" style={{ color: '#6b4c2a' }}>
              No se encontraron cómics para "{query}".
            </p>
          )
        ) : (
          <p className="font-sans text-sm" style={{ color: '#6b4c2a' }}>
            Escribe al menos 2 caracteres para buscar.
          </p>
        )}
      </div>
    </div>
  );
}
