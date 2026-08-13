import { useCallback, useEffect, useState } from 'react';
import type { AdminLog } from '../../lib/api';
import { endpoints } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

const levelColor: Record<string, string> = {
  info: 'text-accent',
  warn: 'text-sev-moderate',
  error: 'text-sev-critical',
  debug: 'text-body-faint',
};

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (level) params.set('level', level);
      if (category) params.set('category', category);
      const data = await endpoints.adminLogs(params.toString());
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar logs.');
    } finally {
      setLoading(false);
    }
  }, [page, level, category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-body">Logs del sistema</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input max-w-[180px]" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} aria-label="Filtrar por nivel">
          <option value="">Todos los niveles</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="debug">debug</option>
        </select>
        <select className="input max-w-[200px]" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          <option value="system">system</option>
          <option value="earthquake">earthquake</option>
          <option value="alert">alert</option>
          <option value="push">push</option>
          <option value="source">source</option>
          <option value="auth">auth</option>
          <option value="admin">admin</option>
          <option value="job">job</option>
        </select>
      </div>
      {error && <ErrorState title="Error" body={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((l) => (
              <li key={l.id} className="card !p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-bold ${levelColor[l.level] ?? 'text-body-muted'}`}>{l.level.toUpperCase()}</span>
                  <span className="badge border-line bg-surface-3 text-body-muted">{l.category}</span>
                  <span className="text-body-faint">{new Date(l.timestamp).toLocaleString('es-CO')}</span>
                </div>
                <p className="mt-1 text-body-muted">{l.message}</p>
                {Object.keys(l.meta ?? {}).length > 0 && (
                  <pre className="mt-1 overflow-x-auto rounded bg-surface-2 p-2 text-[10px] text-body-faint">
                    {JSON.stringify(l.meta, null, 1)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
