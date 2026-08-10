import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminDashboard as DashboardData } from '../../lib/api';
import { endpoints } from '../../lib/api';
import { formatDate, formatMagnitude } from '@shared';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

const sourceStatusBadge: Record<string, string> = {
  up: 'bg-green-500/15 text-green-300 border-green-500/30',
  down: 'bg-red-500/15 text-red-300 border-red-500/30',
  disabled: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  misconfigured: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await endpoints.adminDashboard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el dashboard.');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !data) return <ErrorState title="No se pudo cargar" body={error} />;
  if (!data) return <div className="flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>;

  const cards = [
    { label: 'Eventos últimas 24 h', value: data.counts.last24h },
    { label: 'Eventos última semana', value: data.counts.lastWeek },
    { label: 'Usuarios activos', value: data.counts.activeUsers },
    { label: 'Usuarios con push', value: data.counts.pushUsers },
    { label: 'Alertas enviadas', value: data.counts.alertsSent },
    { label: 'Push fallidos', value: data.counts.alertsFailed },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="card !p-4">
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-black ${c.label.includes('fallidos') && c.value > 0 ? 'text-red-400' : 'text-amber-400'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-100">Último evento</h2>
          {data.lastEvent ? (
            <div>
              <p className="text-lg font-bold text-white">
                M{formatMagnitude(data.lastEvent.magnitude)} · {data.lastEvent.place}
              </p>
              <p className="text-sm text-slate-400">{formatDate(data.lastEvent.eventTime)} · {Math.round(data.lastEvent.depth)} km</p>
              <Link to={`/earthquakes/${data.lastEvent.id}`} className="btn-secondary mt-3 !py-1.5 text-xs">Ver evento</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin eventos registrados.</p>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-bold text-slate-100">Mayor magnitud (semana)</h2>
          {data.maxMagnitudeWeek ? (
            <div>
              <p className="text-lg font-bold text-white">M{formatMagnitude(data.maxMagnitudeWeek.magnitude)} · {data.maxMagnitudeWeek.place}</p>
              <p className="text-sm text-slate-400">{formatDate(data.maxMagnitudeWeek.eventTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin eventos en la última semana.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-bold text-slate-100">Estado de las fuentes sísmicas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3">Fuente</th>
                <th className="pb-2 pr-3">Estado</th>
                <th className="pb-2 pr-3">Última consulta</th>
                <th className="pb-2 pr-3">Último evento</th>
                <th className="pb-2">Tiempo de proceso</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.source} className="border-t border-seismic-700/50">
                  <td className="py-2 pr-3 font-medium text-slate-200">{s.source.toUpperCase()}</td>
                  <td className="py-2 pr-3">
                    <span className={`badge ${sourceStatusBadge[s.status] ?? sourceStatusBadge.disabled}`}>{s.status}</span>
                    {s.lastError && <span className="mt-1 block max-w-[240px] truncate text-xs text-red-400" title={s.lastError}>{s.lastError}</span>}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{s.lastCheckedAt ? formatDate(s.lastCheckedAt) : '—'}</td>
                  <td className="py-2 pr-3 text-slate-400">{s.lastEventAt ? formatDate(s.lastEventAt) : '—'}</td>
                  <td className="py-2 text-slate-400">{s.processingTimeMs !== null ? `${s.processingTimeMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-bold text-slate-100">Configuración activa</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-slate-400">Motor de alertas</p><p className="font-semibold">{data.config.enabled ? 'Activo' : 'Pausado'}</p></div>
          <div><p className="text-xs text-slate-400">Magnitud mínima</p><p className="font-semibold">{data.config.minimumMagnitude}</p></div>
          <div><p className="text-xs text-slate-400">Radio</p><p className="font-semibold">{data.config.alertRadiusKm} km</p></div>
          <div><p className="text-xs text-slate-400">Intervalo de consulta</p><p className="font-semibold">{data.config.pollIntervalSeconds} s</p></div>
        </div>
      </div>
    </div>
  );
}
