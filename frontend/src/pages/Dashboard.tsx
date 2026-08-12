import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { DISCLAIMER_TEXT, calculateDistanceKm, formatDate, formatMagnitude } from '@shared';
import { endpoints } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import EarthquakeCard from '../components/EarthquakeCard';
import ActivateAlerts from '../components/ActivateAlerts';
import { EmptyState, ErrorState, Spinner } from '../components/LoadingScreen';

export default function Dashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<EarthquakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await endpoints.recentEarthquakes(24);
        setRecent(data.items);
      } catch {
        setError('No se pudo consultar la actividad sísmica.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasLocation = Boolean(user?.location?.latitude && user?.location?.longitude);
  const nearby = hasLocation
    ? recent
        .map((e) => ({
          e,
          distanceKm: calculateDistanceKm(e.latitude, e.longitude, user!.location!.latitude, user!.location!.longitude),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5)
    : [];

  const lastEvent = recent[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Hola, {user?.firstName}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {hasLocation
              ? `Estás recibiendo alertas cercanas (radio de ${user?.alertSettings.alertRadiusKm} km).`
              : 'Aún no compartes tu ubicación. Puedes activar alertas nacionales o agregarla en Ajustes.'}
          </p>
        </div>
        <ActivateAlerts />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-slate-400">Eventos últimas 24 h</p>
          <p className="text-3xl font-black text-amber-400">{loading ? '—' : recent.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Alertas cercanas activas</p>
          <p className={`text-3xl font-black ${hasLocation ? 'text-green-400' : 'text-slate-500'}`}>
            {hasLocation ? 'Sí' : 'No'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Alertas nacionales</p>
          <p className={`text-3xl font-black ${user?.alertSettings.nationalAlerts ? 'text-green-400' : 'text-slate-500'}`}>
            {user?.alertSettings.nationalAlerts ? 'Sí' : 'No'}
          </p>
        </div>
      </div>

      {lastEvent && (
        <section aria-labelledby="ultimo">
          <h2 id="ultimo" className="mb-3 text-lg font-bold text-slate-100">Último evento</h2>
          <div className="card border-amber-500/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-xl font-black text-amber-400">
                  {formatMagnitude(lastEvent.magnitude)}
                </span>
                <div>
                  <p className="font-semibold text-slate-100">{lastEvent.place}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(lastEvent.eventTime)} · {Math.round(lastEvent.depth)} km de profundidad
                  </p>
                </div>
              </div>
              <Link to={`/earthquakes/${lastEvent.id}`} className="btn-secondary !py-1.5 text-xs">
                Ver detalle
              </Link>
            </div>
          </div>
        </section>
      )}

      {hasLocation && (
        <section aria-labelledby="cercanos">
          <h2 id="cercanos" className="mb-3 text-lg font-bold text-slate-100">
            Eventos más cercanos a tu ubicación
          </h2>
          <MapView
            events={recent.slice(0, 30)}
            userLocation={{ latitude: user!.location!.latitude, longitude: user!.location!.longitude }}
            showRadii
            radiusKm={user?.alertSettings.alertRadiusKm ?? 100}
            height="360px"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {nearby.map(({ e, distanceKm }) => (
              <EarthquakeCard key={e.id} event={{ ...e, distanceKm }} compact />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
      ) : error ? (
        <ErrorState title="No se pudo cargar" body={error} />
      ) : recent.length === 0 ? (
        <EmptyState title="Sin eventos en las últimas 24 horas" body="Las fuentes sísmicas se consultan automáticamente." />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/settings/location" className="card transition hover:border-seismic-500/60">
          <h3 className="font-semibold text-slate-100">Mi ubicación</h3>
          <p className="mt-1 text-sm text-slate-400">
            {hasLocation
              ? `Guardada (${user?.location?.latitude.toFixed(3)}, ${user?.location?.longitude.toFixed(3)}) · precisión ±${Math.round(user?.location?.accuracy ?? 0)} m`
              : 'Aún no has compartido tu ubicación.'}
          </p>
        </Link>
        <Link to="/settings/alerts" className="card transition hover:border-seismic-500/60">
          <h3 className="font-semibold text-slate-100">Preferencias de alertas</h3>
          <p className="mt-1 text-sm text-slate-400">
            Magnitud mínima {user?.alertSettings.minimumMagnitude} · Radio {user?.alertSettings.alertRadiusKm} km
          </p>
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
