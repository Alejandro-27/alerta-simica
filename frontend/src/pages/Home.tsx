import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { COLOMBIA_DEPARTMENTS, DISCLAIMER_TEXT, formatDate, formatMagnitude } from '@shared';
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

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      void load();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await endpoints.recentEarthquakes(48);
      setRecent(data.items);
    } catch (e) {
      if (isOfflineError(e)) setOffline(true);
      else setError('No se pudo consultar la actividad sísmica.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lastEvent = recent[0] ?? null;
  const maxMag = recent.length ? Math.max(...recent.map((e) => e.magnitude)) : null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-seismic-700/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(44,74,122,0.35),transparent_60%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="badge border-green-500/30 bg-green-500/10 text-green-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="ping-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Monitoreo activo
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Monitoreo sísmico en <span className="text-amber-500">tiempo real</span>
            </h1>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              Consulta eventos sísmicos y recibe alertas según tu ubicación.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActivateAlerts />
              <Link to="/earthquakes" className="btn-secondary">
                Ver terremotos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {offline && <OfflineNotice />}

        {/* Último evento */}
        <section aria-labelledby="ultimo-evento">
          <h2 id="ultimo-evento" className="mb-4 text-xl font-bold text-slate-100">
            Último evento detectado
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400"><Spinner /> Consultando fuentes sísmicas…</div>
          ) : lastEvent ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="card flex flex-col items-center justify-center border-amber-500/30">
                <span className="text-xs text-slate-400">Magnitud</span>
                <span className="text-4xl font-black text-amber-400">{formatMagnitude(lastEvent.magnitude)}</span>
              </div>
              <div className="card flex flex-col justify-center">
                <span className="text-xs text-slate-400">Profundidad</span>
                <span className="text-xl font-bold">{Math.round(lastEvent.depth)} km</span>
              </div>
              <div className="card col-span-2 flex flex-col justify-center">
                <span className="text-xs text-slate-400">Ubicación</span>
                <span className="text-sm font-semibold leading-snug">{lastEvent.place}</span>
              </div>
              <div className="card flex flex-col justify-center">
                <span className="text-xs text-slate-400">Hora</span>
                <span className="text-sm font-semibold">{formatDate(lastEvent.eventTime)}</span>
              </div>
            </div>
          ) : (
            <EmptyState title="Sin eventos recientes" body="Cuando una fuente sísmica reporte un evento, aparecerá aquí." />
          )}
        </section>

        {/* Mapa */}
        <section aria-labelledby="mapa-eventos">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="mapa-eventos" className="text-xl font-bold text-slate-100">
              Mapa de actividad sísmica
            </h2>
            {maxMag !== null && (
              <span className="text-sm text-slate-400">
                Mayor magnitud (48 h): <strong className="text-amber-400">{formatMagnitude(maxMag)}</strong>
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-seismic-700/60 bg-seismic-850">
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
            <h2 id="actividad-reciente" className="text-xl font-bold text-slate-100">
              Actividad sísmica reciente
            </h2>
            <Link to="/earthquakes" className="text-sm font-medium text-amber-400 hover:underline">
              Ver historial completo →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
          ) : error ? (
            <ErrorState title="No se pudo cargar" body={error} />
          ) : recent.length === 0 ? (
            <EmptyState title="Sin eventos en las últimas 48 horas" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.slice(0, 9).map((e) => (
                <EarthquakeCard key={e.id} event={e} compact />
              ))}
            </div>
          )}
        </section>

        {/* Cómo funciona */}
        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="mb-4 text-xl font-bold text-slate-100">
            Cómo funciona
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Consultamos fuentes sísmicas', d: 'El servidor consulta periódicamente al Servicio Geológico Colombiano y al USGS.' },
              { n: '2', t: 'Detectamos nuevos eventos', d: 'Normalizamos, validamos y guardamos cada evento sin duplicados.' },
              { n: '3', t: 'Te avisamos si estás cerca', d: 'Si tu ubicación está dentro del radio, recibes una notificación push.' },
            ].map((s) => (
              <div key={s.n} className="card">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-400">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold text-slate-100">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Instalar */}
        <section aria-labelledby="instalar-app">
          <h2 id="instalar-app" className="mb-4 text-xl font-bold text-slate-100">
            Instalar aplicación
          </h2>
          <InstallGuide compact />
        </section>

        {/* Regiones */}
        <section aria-labelledby="cobertura">
          <h2 id="cobertura" className="mb-4 text-xl font-bold text-slate-100">
            Cobertura en Colombia
          </h2>
          <div className="card">
            <p className="mb-3 text-sm text-slate-400">
              La plataforma monitorea eventos en todo el territorio nacional. Puedes configurar alertas cercanas o nacionales desde tus ajustes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COLOMBIA_DEPARTMENTS.slice(0, 24).map((d) => (
                <span key={d} className="badge border-seismic-600 bg-seismic-800 text-slate-300">
                  {d}
                </span>
              ))}
              <span className="badge border-seismic-600 bg-seismic-800 text-slate-500">y más…</span>
            </div>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">{DISCLAIMER_TEXT}</p>
      </div>
    </div>
  );
}
