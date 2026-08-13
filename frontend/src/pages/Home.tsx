import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { COLOMBIA_DEPARTMENTS, DISCLAIMER_TEXT, formatMagnitude, formatRelativeTime, severityFromEvent } from '@shared';
import { endpoints, isOfflineError } from '../lib/api';
import MapView from '../components/MapView';
import EarthquakeCard from '../components/EarthquakeCard';
import ActivateAlerts from '../components/ActivateAlerts';
import InstallGuide from '../components/InstallGuide';
import { EmptyState, ErrorState, OfflineNotice, Spinner } from '../components/LoadingScreen';

export default function Home() {
  const [recent, setRecent] = useState<EarthquakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await endpoints.recentEarthquakes(48, 'co');
      setRecent(data.items);
    } catch (e) {
      if (isOfflineError(e)) setOffline(true);
      else setError('No se pudo consultar la actividad sísmica.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      void load();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    void load();
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const lastEvent = recent[0] ?? null;
  const maxMag = recent.length ? Math.max(...recent.map((e) => e.magnitude)) : null;
  const lastSeverity = lastEvent ? severityFromEvent(lastEvent) : null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent),0.10),transparent_60%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <span className="badge border-sev-low/30 bg-sev-low/10 text-sev-low">
              <span className="relative flex h-1.5 w-1.5">
                <span className="ping-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-sev-low" />
              </span>
              Monitoreo activo
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-body sm:text-5xl">
              Monitoreo sísmico en <span className="bg-gradient-to-r from-accent to-accent-subtle bg-clip-text text-transparent">Colombia</span>
            </h1>
            <p className="mt-4 text-base text-body-muted sm:text-lg">
              Consulta los sismos detectados y recibe alertas cuando esté cerca de tu ubicación.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActivateAlerts />
              <Link to="/earthquakes" className="btn-secondary">
                Ver historial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {offline && <OfflineNotice />}

        {/* Último evento destacado */}
        <section aria-labelledby="ultimo-evento">
          {loading ? (
            <div className="flex h-40 items-center gap-2 rounded-2xl border border-line bg-surface-2 text-body-muted">
              <Spinner className="mx-auto" /> Consultando fuentes sísmicas…
            </div>
          ) : error ? (
            <ErrorState title="No se pudo cargar" body={error} />
          ) : lastEvent && lastSeverity ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface shadow-card">
              <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
                <span className={`inline-flex items-center gap-3 rounded-2xl border px-5 py-4 ${lastSeverity.color}`}>
                  <span className="text-5xl font-black leading-none tabular-nums">{formatMagnitude(lastEvent.magnitude)}</span>
                  <span className="text-sm font-semibold">{lastSeverity.shortLabel}</span>
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-body-faint">Último sismo detectado</p>
                  <h2 className="mt-1 text-xl font-bold text-body sm:text-2xl">{lastEvent.place}</h2>
                  <p className="mt-1 text-sm text-body-muted">{formatRelativeTime(lastEvent.eventTime)}</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-body-muted">{lastSeverity.description}</p>
                </div>
                <Link to={`/earthquakes/${lastEvent.id}`} className="btn-primary shrink-0">
                  Ver detalles
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState title="Sin eventos recientes en Colombia" body="Cuando una fuente sísmica reporte un evento, aparecerá aquí." />
          )}
        </section>

        {/* Mapa */}
        <section aria-labelledby="mapa-eventos">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="mapa-eventos" className="text-xl font-bold text-body">
              Mapa de actividad sísmica
            </h2>
            {maxMag !== null && (
              <span className="text-sm text-body-muted">
                Mayor magnitud (48 h): <strong className="text-accent">{formatMagnitude(maxMag)}</strong>
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-line bg-surface-2">
              <Spinner /> Cargando mapa…
            </div>
          ) : error ? (
            <ErrorState title="Mapa no disponible" body={error} />
          ) : (
            <MapView events={recent.slice(0, 30)} height="420px" />
          )}
        </section>

        {/* Actividad reciente */}
        <section aria-labelledby="actividad-reciente">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="actividad-reciente" className="text-xl font-bold text-body">
              Actividad reciente (48 h)
            </h2>
            <Link to="/earthquakes" className="link text-sm">
              Ver historial completo →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>
          ) : error ? (
            <ErrorState title="No se pudo cargar" body={error} />
          ) : recent.length === 0 ? (
            <EmptyState title="Sin eventos en las últimas 48 horas" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.slice(0, 6).map((e, i) => (
                <div key={e.id} style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}>
                  <EarthquakeCard event={e} compact />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cómo funciona */}
        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="mb-4 text-xl font-bold text-body">
            Cómo funciona
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Consultamos fuentes sísmicas', d: 'Revisamos continuamente datos del Servicio Geológico Colombiano y del USGS.' },
              { n: '2', t: 'Detectamos nuevos sismos', d: 'Guardamos cada evento sin duplicados y lo mostramos en un lenguaje claro.' },
              { n: '3', t: 'Te avisamos si estás cerca', d: 'Si tu ubicación está cerca del epicentro y activas las alertas, recibes una notificación.' },
            ].map((s) => (
              <div key={s.n} className="card card-hover">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 font-bold text-accent">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold text-body">{s.t}</h3>
                <p className="mt-1 text-sm text-body-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Instalar */}
        <section aria-labelledby="instalar-app">
          <h2 id="instalar-app" className="mb-4 text-xl font-bold text-body">
            Instalar aplicación
          </h2>
          <InstallGuide compact />
        </section>

        {/* Cobertura */}
        <section aria-labelledby="cobertura">
          <h2 id="cobertura" className="mb-4 text-xl font-bold text-body">
            Cobertura en Colombia
          </h2>
          <div className="card">
            <p className="mb-3 text-sm text-body-muted">
              La plataforma monitorea eventos en todo el territorio nacional. Puedes configurar alertas cercanas o nacionales desde tus ajustes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COLOMBIA_DEPARTMENTS.slice(0, 24).map((d) => (
                <span key={d} className="badge border-line bg-surface-3 text-body-muted">{d}</span>
              ))}
              <span className="badge border-line bg-surface-3 text-body-faint">y más…</span>
            </div>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-body-faint">{DISCLAIMER_TEXT}</p>
      </div>
    </div>
  );
}