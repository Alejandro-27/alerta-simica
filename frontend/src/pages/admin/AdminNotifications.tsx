import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminNotification } from '../../lib/api';
import { endpoints } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

export default function AdminNotifications() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (type) params.set('type', type);
      const data = await endpoints.adminNotifications(params.toString());
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar notificaciones.');
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-body">Notificaciones</h2>
      <div className="mb-4">
        <select className="input max-w-[260px]" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="EARTHQUAKE_DETECTED">Evento detectado</option>
          <option value="EARTHQUAKE_ALERT">Alerta de afectación</option>
          <option value="SYSTEM_NOTIFICATION">Sistema</option>
          <option value="TEST_NOTIFICATION">Prueba</option>
        </select>
      </div>
      {error && <ErrorState title="Error" body={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-3 text-xs uppercase text-body-faint">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Mensaje</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-t border-line align-top">
                    <td className="px-4 py-3 text-xs text-body-muted">
                      {n.user ? `${n.user.firstName ?? ''} ${n.user.lastName ?? ''}`.trim() || n.user.email : n.userId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge border-line bg-surface-3 text-body-muted">{n.type}</span>
                    </td>
                    <td className="max-w-[300px] px-4 py-3 text-xs text-body-muted">
                      <p className="font-medium text-body">{n.title}</p>
                      <p className="truncate text-body-muted">{n.body}</p>
                      {n.earthquakeId && (
                        <Link to={`/earthquakes/${n.earthquakeId}`} className="text-accent hover:underline">ver evento →</Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-body-muted">{n.level}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${n.delivered ? 'border-sev-low/30 bg-sev-low/10 text-sev-low' : 'border-sev-critical/30 bg-sev-critical/10 text-sev-critical'}`}>
                        {n.delivered ? 'Entregada' : 'Fallida'}
                      </span>
                      {n.error && <p className="mt-1 max-w-[180px] truncate text-xs text-sev-critical" title={n.error}>{n.error}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-body-muted">{new Date(n.sentAt).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
