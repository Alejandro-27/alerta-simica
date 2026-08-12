import { Link } from 'react-router-dom';
import type { EarthquakeRecord } from '@shared';
import {
  depthCategory,
  formatDistanceKm,
  formatMagnitude,
  formatRelativeTime,
  severityFromEvent,
} from '@shared';

const sourceBadge: Record<string, string> = {
  sgc: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  usgs: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  mock: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
};

export default function EarthquakeCard({ event, compact = false }: { event: EarthquakeRecord; compact?: boolean }) {
  const severity = severityFromEvent(event);
  const depth = depthCategory(event.depth);

  return (
    <Link
      to={`/earthquakes/${event.id}`}
      className={`card card-hover fade-up block ${compact ? 'p-4' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`chip border ${severity.color}`}>
          <span className="text-2xl font-black leading-none">{formatMagnitude(event.magnitude)}</span>
          <span className="text-xs font-semibold">{severity.shortLabel}</span>
        </span>
        {event.tsunami && (
          <span className="badge border-red-500/30 bg-red-500/15 text-red-300">Alerta de tsunami</span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 font-semibold leading-snug text-slate-100">{event.place}</h3>

      <p className="mt-1 text-xs text-slate-400" title={new Date(event.eventTime).toLocaleString('es-CO')}>
        {formatRelativeTime(event.eventTime)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="badge border-white/5 bg-white/5 text-slate-300">{formatMagnitude(event.magnitude)} M</span>
        <span className="badge border-white/5 bg-white/5 text-slate-300">{depth.shortLabel}</span>
        <span className={`badge ${sourceBadge[event.source] ?? sourceBadge.usgs}`}>
          {event.source === 'sgc' ? 'SGC' : event.source === 'usgs' ? 'USGS' : event.source}
        </span>
        {event.demo && <span className="badge border-purple-500/30 bg-purple-500/15 text-purple-300">DEMO</span>}
        {event.distanceKm !== null && event.distanceKm !== undefined && (
          <span className="badge border-accent/20 bg-accent/10 text-accent">
            {formatDistanceKm(event.distanceKm)} de ti
          </span>
        )}
      </div>
    </Link>
  );
}
