import { useEffect, useState } from 'react';
import type { EarthquakeRecord } from '@shared';
import { formatDate, formatMagnitude } from '@shared';
import { endpoints } from '../lib/api';
import { OfflineNotice, Spinner } from '../components/LoadingScreen';

/** Página offline: muestra la última información disponible en cache. */
export default function OfflinePage() {
  const [items, setItems] = useState<EarthquakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await endpoints.recentEarthquakes(72);
        setItems(data.items);
        setLastUpdated(new Date());
      } catch {
        // Sin red ni cache: vacío.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <OfflineNotice />
      <h1 className="mt-4 text-2xl font-extrabold text-white">Últimos eventos conocidos</h1>
      <p className="mt-1 text-sm text-slate-400">
        {lastUpdated
          ? `Información almacenada localmente · actualizada ${formatDate(lastUpdated)}`
          : 'No hay información almacenada en este dispositivo.'}
      </p>
      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-slate-400"><Spinner /> Leyendo cache local…</div>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          No hay eventos almacenados. Cuando tengas conexión, la aplicación descargará los datos más recientes.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((e) => (
            <li key={e.id} className="card flex items-center justify-between gap-3 !p-4">
              <div>
                <p className="font-semibold text-slate-100">{e.place}</p>
                <p className="text-xs text-slate-400">{formatDate(e.eventTime)}</p>
              </div>
              <span className="text-2xl font-black text-amber-400">{formatMagnitude(e.magnitude)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-slate-500">
        AlertaSísmica no simula datos nuevos cuando estás sin conexión: solo muestra la última información descargada.
      </p>
    </div>
  );
}
