import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import { ALERT_LEVEL_BADGES, formatDate, formatDistanceKm, formatMagnitude } from '@shared';

const sourceBadge: Record<string, string> = {
  sgc: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  usgs: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  mock: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export default function EarthquakeCard({ event, compact = false }: { event: EarthquakeRecord; compact?: boolean }) {
  const badge = ALERT_LEVEL_BADGES[event.level as keyof typeof ALERT_LEVEL_BADGES] ?? ALERT_LEVEL_BADGES.NORMAL;
  return (
    <Link
      to={`/earthquakes/${event.id}`}
      className="card block transition hover:border-seismic-500/60 hover:bg-seismic-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${
              event.magnitude >= 5.5 ? 'bg-red-500/15 text-red-400' : event.magnitude >= 4.5 ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'
            }`}
            aria-label={`Magnitud ${formatMagnitude(event.magnitude)}`}
          >
            {formatMagnitude(event.magnitude)}
          </span>
          <div>
            <p className="font-semibold leading-tight text-slate-100">
              M{formatMagnitude(event.magnitude)} · {event.place}
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(event.eventTime)} · {Math.round(event.depth)} km de profundidad
            </p>
          </div>
        </div>
        {!compact && badge && (
          <span className={`badge ${badge.color}`}>{badge.label}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className={`badge ${sourceBadge[event.source] ?? sourceBadge.usgs}`}>
          {event.source === 'sgc' ? 'SGC' : event.source === 'usgs' ? 'USGS' : event.source}
        </span>
        {event.demo && <span className="badge border-purple-500/30 bg-purple-500/15 text-purple-300">DEMO</span>}
        {event.distanceKm !== null && event.distanceKm !== undefined && (
          <span className="badge border-seismic-600 bg-seismic-800 text-slate-300">
            {formatDistanceKm(event.distanceKm)} de ti
          </span>
        )}
        {event.tsunami && <span className="badge border-red-500/30 bg-red-500/15 text-red-300">Alerta de tsunami</span>}
      </div>
    </Link>
  );
}
