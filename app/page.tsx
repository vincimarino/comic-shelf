import { getAllSeries, getStats } from '@/lib/data';
import HomeShelf from '@/components/HomeShelf';

export const revalidate = 60;

export default async function HomePage() {
  const [allSeries, stats] = await Promise.all([getAllSeries(), getStats()]);

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(180deg, #1a0e06 0%, #0e0804 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <h1
            className="font-serif font-bold tracking-wide mb-2"
            style={{ fontSize: 'clamp(22px, 4vw, 52px)', color: '#d4a96a', textShadow: '0 2px 20px rgba(212,169,106,0.2)' }}
          >
            Mi Biblioteca de Cómics
          </h1>
          <p className="font-sans mb-5" style={{ fontSize: 'clamp(11px, 1.5vw, 16px)', color: '#6b4c2a' }}>
            Colección personal · {stats.comics} tomos · {stats.series} series
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Tomos',       value: stats.comics },
              { label: 'Series',      value: stats.series },
              { label: 'Editoriales', value: stats.publishers },
            ].map(s => (
              <div key={s.label} className="font-sans px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2c1a0e', fontSize: 'clamp(11px, 1.2vw, 14px)', color: '#6b4c2a' }}>
                <span style={{ color: '#d4a96a', fontWeight: 700 }}>{s.value}</span>{' '}{s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estantería con toggle — componente cliente */}
      <HomeShelf allSeries={allSeries} />
    </div>
  );
}
