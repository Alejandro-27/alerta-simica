import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { COLOMBIA_DEPARTMENTS, DISCLAIMER_TEXT, formatMagnitude, formatRelativeTime, severityFromEvent } from '@shared';
import { endpoints, isOfflineError } from '../lib/api';
import MapView from '../components/MapView';
import EarthquakeCard from '../components/EarthquakeCard';
import ActivateAlerts from '../components/ActivateAlerts';
import InstallGuide from '../components/InstallGuide';
import { EmptyState, ErrorState, OfflineNotice, Spinner } from '../components/LoadingScreen';

const STEPS = [
  { n: '1', t: 'Consultamos fuentes oficiales', d: 'Revisamos continuamente los datos del Servicio Geológico Colombiano y del USGS.' },
  { n: '2', t: 'Detectamos nuevos sismos', d: 'Guardamos cada evento sin duplicados y lo explicamos en lenguaje claro.' },
  { n: '3', t: 'Te avisamos si estás cerca', d: 'Si tu ubicación está dentro del radio que elijas, recibes una notificación.' },
];

function SeismicTrace() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-accent/25"
      viewBox="0 0 1200 48"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 24 H180 l8 -14 l6 28 l7 -22 l6 16 l10 -8 H360 l6 -18 l7 30 l7 -24 l9 18 l8 -6 H620 l8 -20 l7 34 l7 -26 l10 20 l9 -8 H900 l7 -16 l6 26 l7 -20 l9 14 l8 -4 H1200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_70%_at_30%_20%,black,transparent)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-body-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-sev-low pulse-dot" />
              Monitoreo activo · SGC / USGS
            </p>
            <h1 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-body">
              Actividad sísmica en Colombia, sin tecnicismos.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-body-muted sm:text-lg">
              Consulta los sismos detectados en las últimas horas y recibe una alerta cuando ocurran cerca de ti.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActivateAlerts />
              <Link to="/earthquakes" className="btn-secondary">
                Ver historial
              </Link>
            </div>
          </div>

          {!loading && !error && recent.length > 0 && (
            <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="text-body-faint">Eventos (48 h)</dt>
                <dd className="font-semibold tabular-nums text-body">{recent.length}</dd>
              </div>
              {maxMag !== null && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-body-faint">Mayor magnitud</dt>
                  <dd className="font-semibold tabular-nums text-body">{formatMagnitude(maxMag)}</dd>
                </div>
              )}
              {lastEvent && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-body-faint">Último evento</dt>
                  <dd className="font-semibold text-body">{formatRelativeTime(lastEvent.eventTime)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <SeismicTrace />
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        {offline && <OfflineNotice />}

        {/* Último evento destacado */}
        <section aria-labelledby="ultimo-evento">
          {loading ? (
            <div className="flex h-40 items-center gap-2 rounded-md border border-line bg-surface-2 text-body-muted">
              <Spinner className="mx-auto" /> Consultando fuentes sísmicas…
            </div>
          ) : error ? (
            <ErrorState title="No se pudo cargar" body={error} />
          ) : lastEvent && lastSeverity ? (
            <div className="overflow-hidden rounded-md border border-line bg-surface-2 shadow-card-light">
              <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
                <span className={`inline-flex items-center gap-3 rounded-md border px-5 py-4 ${lastSeverity.color}`}>
                  <span className="text-5xl font-bold leading-none tabular-nums">{formatMagnitude(lastEvent.magnitude)}</span>
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
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="mapa-eventos" className="text-lg font-bold text-body">
              Mapa de actividad sísmica
            </h2>
            <p className="text-sm text-body-faint">Últimas 48 horas</p>
          </div>
          {loading ? (
            <div className="flex h-[420px] items-center justify-center rounded-md border border-line bg-surface-2">
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
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="actividad-reciente" className="text-lg font-bold text-body">
              Actividad reciente
            </h2>
            <Link to="/earthquakes" className="link inline-flex items-center py-1.5 text-sm">
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
                <div key={e.id} className="stagger" style={{ '--stagger': i } as CSSProperties}>
                  <EarthquakeCard event={e} compact />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cómo funciona — pasos conectados, no tarjetas idénticas */}
        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="text-lg font-bold text-body">
            Cómo funciona
          </h2>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-0">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`flex gap-4 sm:block sm:px-6 ${i > 0 ? 'sm:border-l sm:border-line' : 'sm:pl-0'} ${
                  i < STEPS.length - 1 ? '' : 'sm:pr-0'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-sm font-bold text-accent">
                  {s.n}
                </span>
                <div className="sm:mt-4">
                  <h3 className="font-semibold text-body">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Instalar */}
        <section aria-labelledby="instalar-app">
          <h2 id="instalar-app" className="mb-4 text-lg font-bold text-body">
            Instalar aplicación
          </h2>
          <InstallGuide compact />
        </section>

        {/* Cobertura */}
        <section aria-labelledby="cobertura">
          <h2 id="cobertura" className="mb-4 text-lg font-bold text-body">
            Cobertura en Colombia
          </h2>
          <div className="card">
            <p className="mb-3 text-sm leading-relaxed text-body-muted">
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
