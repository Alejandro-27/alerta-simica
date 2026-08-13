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
  sgc: 'border-line bg-surface-3 text-body-muted',
  usgs: 'border-line bg-surface-3 text-body-muted',
  mock: 'border-line bg-surface-3 text-body-muted',
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
          <span className="text-2xl font-black leading-none tabular-nums">{formatMagnitude(event.magnitude)}</span>
          <span className="text-xs font-semibold">{severity.shortLabel}</span>
        </span>
        {event.tsunami && (
          <span className="badge border-sev-critical/30 bg-sev-critical/10 text-sev-critical">Alerta de tsunami</span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 font-semibold leading-snug text-body">{event.place}</h3>

      <p className="mt-1 text-xs text-body-muted" title={new Date(event.eventTime).toLocaleString('es-CO')}>
        {formatRelativeTime(event.eventTime)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="badge border-line bg-surface-3 text-body-muted tabular-nums">{formatMagnitude(event.magnitude)} M</span>
        <span className="badge border-line bg-surface-3 text-body-muted">{depth.shortLabel}</span>
        <span className={`badge ${sourceBadge[event.source] ?? sourceBadge.usgs}`}>
          {event.source === 'sgc' ? 'SGC' : event.source === 'usgs' ? 'USGS' : event.source}
        </span>
        {event.demo && <span className="badge border-sev-moderate/30 bg-sev-moderate/10 text-sev-moderate">DEMO</span>}
        {event.distanceKm !== null && event.distanceKm !== undefined && (
          <span className="badge border-accent/20 bg-accent/10 text-accent">
            {formatDistanceKm(event.distanceKm)} de ti
          </span>
        )}
      </div>
    </Link>
  );
}
