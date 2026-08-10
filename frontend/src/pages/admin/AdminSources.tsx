import { useCallback, useEffect, useState } from 'react';
import type { AdminSource } from '../../lib/api';
import { endpoints } from '../../lib/api';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

const statusBadge: Record<string, string> = {
  up: 'border-green-500/30 bg-green-500/10 text-green-300',
  down: 'border-red-500/30 bg-red-500/10 text-red-300',
  disabled: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  misconfigured: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

export default function AdminSources() {
  const [items, setItems] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await endpoints.adminSources();
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar fuentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-slate-100">Fuentes sísmicas</h2>
      {error && <ErrorState title="Error" body={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((s) => (
            <div key={s.source} className="card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-100">{s.label}</h3>
                <span className={`badge ${statusBadge[s.status] ?? statusBadge.disabled}`}>{s.status}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-slate-400">Configurada</dt><dd className="font-semibold">{s.configured ? 'Sí' : 'No (falta URL)'}</dd></div>
                <div><dt className="text-xs text-slate-400">Habilitada</dt><dd className="font-semibold">{s.enabled ? 'Sí' : 'No'}</dd></div>
                <div><dt className="text-xs text-slate-400">Última consulta</dt><dd className="text-xs">{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('es-CO') : '—'}</dd></div>
                <div><dt className="text-xs text-slate-400">Fallos consecutivos</dt><dd className="text-xs">{s.consecutiveFailures}</dd></div>
                <div><dt className="text-xs text-slate-400">Último evento</dt><dd className="text-xs">{s.lastEventAt ? new Date(s.lastEventAt).toLocaleString('es-CO') : '—'}</dd></div>
                <div><dt className="text-xs text-slate-400">Tiempo de proceso</dt><dd className="text-xs">{s.processingTimeMs !== null ? `${s.processingTimeMs} ms` : '—'}</dd></div>
              </dl>
              {s.lastError && (
                <p className="mt-3 rounded bg-red-500/10 p-2 text-xs text-red-300">{s.lastError}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Nota: «Configurada» depende de las variables de entorno (SGC_API_URL, USGS_API_URL). Activar o desactivar una fuente se hace desde «Configuración».
      </p>
    </div>
  );
}
