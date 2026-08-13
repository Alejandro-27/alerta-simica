import { useCallback, useEffect, useState } from 'react';
import type { AdminSource } from '../../lib/api';
import { endpoints } from '../../lib/api';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

const statusBadge: Record<string, string> = {
  up: 'border-sev-low/30 bg-sev-low/10 text-sev-low',
  down: 'border-sev-critical/30 bg-sev-critical/10 text-sev-critical',
  disabled: 'border-line bg-surface-3 text-body-muted',
  misconfigured: 'border-sev-moderate/30 bg-sev-moderate/10 text-sev-moderate',
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
      <h2 className="mb-4 text-lg font-bold text-body">Fuentes sísmicas</h2>
      {error && <ErrorState title="Error" body={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((s) => (
            <div key={s.source} className="card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-body">{s.label}</h3>
                <span className={`badge ${statusBadge[s.status] ?? statusBadge.disabled}`}>{s.status}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-body-muted">Configurada</dt><dd className="font-semibold">{s.configured ? 'Sí' : 'No (falta URL)'}</dd></div>
                <div><dt className="text-xs text-body-muted">Habilitada</dt><dd className="font-semibold">{s.enabled ? 'Sí' : 'No'}</dd></div>
                <div><dt className="text-xs text-body-muted">Última consulta</dt><dd className="text-xs">{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('es-CO') : '—'}</dd></div>
                <div><dt className="text-xs text-body-muted">Fallos consecutivos</dt><dd className="text-xs">{s.consecutiveFailures}</dd></div>
                <div><dt className="text-xs text-body-muted">Último evento</dt><dd className="text-xs">{s.lastEventAt ? new Date(s.lastEventAt).toLocaleString('es-CO') : '—'}</dd></div>
                <div><dt className="text-xs text-body-muted">Tiempo de proceso</dt><dd className="text-xs">{s.processingTimeMs !== null ? `${s.processingTimeMs} ms` : '—'}</dd></div>
              </dl>
              {s.lastError && (
                <p className="mt-3 rounded bg-sev-critical/10 p-2 text-xs text-sev-critical">{s.lastError}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-body-faint">
        Nota: «Configurada» depende de las variables de entorno (SGC_API_URL, USGS_API_URL). Activar o desactivar una fuente se hace desde «Configuración».
      </p>
    </div>
  );
}
