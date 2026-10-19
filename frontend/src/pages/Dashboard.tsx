import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { DISCLAIMER_TEXT, calculateDistanceKm, formatDate, formatMagnitude, resolveColombiaLocation } from '@shared';
import { endpoints } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import EarthquakeCard from '../components/EarthquakeCard';
import ActivateAlerts from '../components/ActivateAlerts';
import { EmptyState, ErrorState, Spinner } from '../components/LoadingScreen';

function userCoords(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  if (user.location?.latitude && user.location?.longitude) {
    return { latitude: user.location.latitude, longitude: user.location.longitude, source: 'gps' as const };
  }
  const manual = user.locationManual;
  if (manual?.latitude && manual?.longitude) {
    return {
      latitude: manual.latitude,
      longitude: manual.longitude,
      source: 'manual' as const,
    };
  }
  if (manual?.department) {
    const resolved = resolveColombiaLocation(manual.department, manual.municipality ?? '');
    if (resolved) {
      return { latitude: resolved.latitude, longitude: resolved.longitude, source: 'manual' as const };
    }
  }
  return null;
}

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

  const coords = user ? userCoords(user) : null;
  const hasLocation = Boolean(coords);

  const nearby = hasLocation && coords
    ? recent
        .map((e) => ({
          e,
          distanceKm:
            e.distanceKm ??
            calculateDistanceKm(e.latitude, e.longitude, coords.latitude, coords.longitude),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5)
    : [];

  const lastEvent = recent[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-body">Hola, {user?.firstName}</h1>
          <p className="mt-1 text-sm text-body-muted">
            {hasLocation
              ? coords?.source === 'manual'
                ? `Distancia calculada desde tu ubicación manual (${user?.locationManual?.municipality ?? user?.locationManual?.department}).`
                : `Estás recibiendo alertas cercanas (radio de ${user?.alertSettings.alertRadiusKm} km).`
              : 'Aún no compartes tu ubicación. Puedes activar alertas nacionales o agregarla en Ajustes.'}
          </p>
        </div>
        <ActivateAlerts />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-body-faint">Eventos últimas 24 h</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-body">{loading ? '—' : recent.length}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-body-faint">Alertas cercanas</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasLocation ? 'bg-sev-low' : 'bg-body-faint'}`} />
            <span className={`text-lg font-semibold ${hasLocation ? 'text-sev-low' : 'text-body-faint'}`}>
              {hasLocation ? 'Activas' : 'Inactivas'}
            </span>
          </div>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-body-faint">Alertas nacionales</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${user?.alertSettings.nationalAlerts ? 'bg-sev-low' : 'bg-body-faint'}`} />
            <span className={`text-lg font-semibold ${user?.alertSettings.nationalAlerts ? 'text-sev-low' : 'text-body-faint'}`}>
              {user?.alertSettings.nationalAlerts ? 'Activas' : 'Inactivas'}
            </span>
          </div>
        </div>
      </div>

      {lastEvent && (
        <section aria-labelledby="ultimo">
          <h2 id="ultimo" className="mb-3 text-lg font-bold text-body">Último evento</h2>
          <div className="card border-sev-strong/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-sev-strong/15 text-xl font-bold tabular-nums text-sev-strong">
                  {formatMagnitude(lastEvent.magnitude)}
                </span>
                <div>
                  <p className="font-semibold text-body">{lastEvent.place}</p>
                  <p className="text-xs text-body-muted">
                    {formatDate(lastEvent.eventTime)} · {Math.round(lastEvent.depth)} km de profundidad
                  </p>
                </div>
              </div>
              <Link to={`/earthquakes/${lastEvent.id}`} className="btn-secondary btn-sm">
                Ver detalle
              </Link>
            </div>
          </div>
        </section>
      )}

      {hasLocation && coords && (
        <section aria-labelledby="cercanos">
          <h2 id="cercanos" className="mb-3 text-lg font-bold text-body">
            Eventos más cercanos a tu ubicación
          </h2>
          <MapView
            events={recent.slice(0, 30)}
            userLocation={{ latitude: coords.latitude, longitude: coords.longitude }}
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
        <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>
      ) : error ? (
        <ErrorState title="No se pudo cargar" body={error} />
      ) : recent.length === 0 ? (
        <EmptyState title="Sin eventos en las últimas 24 horas" body="Las fuentes sísmicas se consultan automáticamente." />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/settings/location" className="card card-hover">
          <h3 className="font-semibold text-body">Mi ubicación</h3>
          <p className="mt-1 text-sm text-body-muted">
            {coords
              ? coords.source === 'gps'
                ? `GPS (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}) · precisión ±${Math.round(user?.location?.accuracy ?? 0)} m`
                : `Manual: ${user?.locationManual?.municipality ?? user?.locationManual?.department} (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`
              : 'Aún no has compartido tu ubicación.'}
          </p>
        </Link>
        <Link to="/settings/alerts" className="card card-hover">
          <h3 className="font-semibold text-body">Preferencias de alertas</h3>
          <p className="mt-1 text-sm text-body-muted">
            Magnitud mínima {user?.alertSettings.minimumMagnitude} · Radio {user?.alertSettings.alertRadiusKm} km
          </p>
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-body-faint">{DISCLAIMER_TEXT}</p>
    </div>
  );
}