import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { ALERT_LEVEL_BADGES, formatDate, formatMagnitude } from '@shared';
import { endpoints } from '../lib/api';
import MapView from '../components/MapView';
import { ErrorState, Spinner } from '../components/LoadingScreen';

const sourceLabels: Record<string, string> = {
  sgc: 'Servicio Geológico Colombiano (SGC)',
  usgs: 'USGS (US Geological Survey)',
  mock: 'Fuente simulada (DEMO)',
};

export default function EarthquakeDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EarthquakeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    endpoints
      .earthquake(id)
      .then((d) => setEvent(d.earthquake))
      .catch(() => setError('No se encontró el evento sísmico.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-20 text-slate-400">
        <Spinner /> Cargando evento…
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <ErrorState title={error ?? 'Evento no encontrado'} body="Puede que el evento haya sido eliminado o la URL sea incorrecta." />
        <Link to="/earthquakes" className="btn-secondary mt-4">Volver al historial</Link>
      </div>
    );
  }

  const badge = ALERT_LEVEL_BADGES[event.level as keyof typeof ALERT_LEVEL_BADGES] ?? ALERT_LEVEL_BADGES.NORMAL;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/earthquakes" className="text-sm text-slate-400 hover:text-white">← Historial</Link>
        <span className={`badge ${badge.color}`}>{badge.label}</span>
      </div>

      <header className="card border-amber-500/30">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/15 text-4xl font-black text-amber-400">
            {formatMagnitude(event.magnitude)}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-white">M{formatMagnitude(event.magnitude)} · {event.place}</h1>
            <p className="mt-1 text-sm text-slate-400">{formatDate(event.eventTime)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge border-seismic-600 bg-seismic-800 text-slate-300">
                Fuente: {sourceLabels[event.source] ?? event.source}
              </span>
              {event.demo && <span className="badge border-purple-500/30 bg-purple-500/15 text-purple-300">DATOS DE DEMOSTRACIÓN</span>}
              {event.tsunami && <span className="badge border-red-500/30 bg-red-500/15 text-red-300">Alerta de tsunami</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Profundidad', value: `${Math.round(event.depth)} km` },
          { label: 'Tipo de magnitud', value: event.magnitudeType || 'N/D' },
          { label: 'Estado', value: event.status },
          { label: 'Coordenadas', value: `${event.latitude.toFixed(3)}, ${event.longitude.toFixed(3)}` },
          { label: 'Primera detección', value: formatDate(event.firstDetectedAt) },
          { label: 'Última actualización', value: formatDate(event.lastSeenAt) },
          { label: 'Reportes de percepción', value: event.felt !== null ? String(event.felt) : 'N/D' },
          { label: 'Nivel de alerta (fuente)', value: event.alertLevel ?? 'No reportado' },
        ].map((s) => (
          <div key={s.label} className="card !p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-bold text-slate-100">Epicentro</h2>
        <MapView events={[event]} height="360px" showRadii={Boolean(event.distanceKm !== null)} radiusKm={event.distanceKm ?? 100} selectedId={event.id} />
      </div>

      {event.sourceUrl && (
        <p className="text-sm">
          Enlace oficial:{' '}
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
          >
            {event.source === 'sgc' ? 'ver evento en el SGC' : 'ver evento en USGS'}
          </a>
        </p>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        Este evento fue reportado por {sourceLabels[event.source] ?? event.source}. Los datos científicos oficiales no se modifican; la información cruda queda guardada para auditoría.
      </p>
    </div>
  );
}
