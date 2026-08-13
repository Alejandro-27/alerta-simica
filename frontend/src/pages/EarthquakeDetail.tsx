import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { depthCategory, formatDate, formatDistanceKm, formatMagnitude, formatRelativeTime, severityFromEvent } from '@shared';
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
  const [showTechnical, setShowTechnical] = useState(false);

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
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-20 text-body-muted">
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

  const severity = severityFromEvent(event);
  const depth = depthCategory(event.depth);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/earthquakes" className="text-sm text-body-muted hover:text-body">← Historial</Link>
        {event.demo && (
          <span className="badge border-sev-moderate/30 bg-sev-moderate/10 text-sev-moderate">DATOS DE DEMOSTRACIÓN</span>
        )}
      </div>

      <header className="card overflow-hidden">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className={`inline-flex items-center gap-3 rounded-2xl border px-6 py-5 ${severity.color}`}>
            <span className="text-6xl font-black leading-none tabular-nums">{formatMagnitude(event.magnitude)}</span>
            <span className="text-lg font-bold">{severity.shortLabel}</span>
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-body-faint">Magnitud en la escala de Richter</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-body sm:text-3xl">{event.place}</h1>
            <p className="mt-2 text-sm text-body-muted">{severity.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge border-line bg-surface-3 text-body-muted">{formatRelativeTime(event.eventTime)}</span>
              <span className="badge border-line bg-surface-3 text-body-muted">{depth.label}</span>
              <span className="badge border-line bg-surface-3 text-body-muted">Fuente: {sourceLabels[event.source] ?? event.source}</span>
              {event.tsunami && <span className="badge border-sev-critical/30 bg-sev-critical/10 text-sev-critical">Alerta de tsunami</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Datos simples */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card !p-5">
          <p className="text-xs font-medium text-body-muted">Profundidad</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-body">{Math.round(event.depth)} km</p>
          <p className="mt-0.5 text-xs text-body-faint">{depth.shortLabel}</p>
        </div>
        <div className="card !p-5">
          <p className="text-xs font-medium text-body-muted">Hora local</p>
          <p className="mt-1 text-xl font-bold text-body">{formatDate(event.eventTime)}</p>
        </div>
        <div className="card !p-5">
          <p className="text-xs font-medium text-body-muted">Coordenadas</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-body">
            {event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°
          </p>
        </div>
        <div className="card !p-5">
          <p className="text-xs font-medium text-body-muted">Distancia a ti</p>
          {event.distanceKm !== null && event.distanceKm !== undefined ? (
            <>
              <p className="mt-1 text-xl font-bold tabular-nums text-accent">{formatDistanceKm(event.distanceKm)}</p>
              <p className="mt-0.5 text-xs text-body-faint">desde tu ubicación registrada</p>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold text-body">—</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-bold text-body">Epicentro en el mapa</h2>
        <MapView events={[event]} height="360px" showRadii={Boolean(event.distanceKm !== null)} radiusKm={event.distanceKm ?? 100} selectedId={event.id} />
      </div>

      {event.sourceUrl && (
        <p className="text-sm">
          Enlace oficial:{' '}
          <a href={event.sourceUrl} target="_blank" rel="noreferrer noopener" className="link">
            {event.source === 'sgc' ? 'ver evento en el SGC' : 'ver evento en USGS'}
          </a>
        </p>
      )}

      {/* Detalles técnicos */}
      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnical((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium text-body hover:text-body-muted"
          aria-expanded={showTechnical}
        >
          Detalles técnicos para expertos
          <svg className={`h-4 w-4 transition-transform text-body-muted ${showTechnical ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {showTechnical && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 border-t border-line px-5 py-4 text-sm sm:grid-cols-2">
            {[
              { label: 'Tipo de magnitud', value: event.magnitudeType || 'N/D' },
              { label: 'Estado del reporte', value: event.status },
              { label: 'Nivel de alerta (fuente)', value: event.alertLevel ?? 'No reportado' },
              { label: 'Reportes de percepción', value: event.felt !== null ? String(event.felt) : 'N/D' },
              { label: 'Primera detección', value: formatDate(event.firstDetectedAt) },
              { label: 'Última actualización', value: formatDate(event.lastSeenAt) },
              { label: 'ID de referencia', value: event.externalId },
              { label: 'Datos crudos en archivo', value: event.hasRawData ? 'Sí' : 'No' },
            ].map((s) => (
              <div key={s.label} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
                <dt className="text-body-faint">{s.label}</dt>
                <dd className="text-right font-medium text-body">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <p className="text-xs leading-relaxed text-body-faint">
        Este evento fue reportado por {sourceLabels[event.source] ?? event.source}. Los datos científicos oficiales no se modifican; la información cruda queda guardada para auditoría.
      </p>
    </div>
  );
}