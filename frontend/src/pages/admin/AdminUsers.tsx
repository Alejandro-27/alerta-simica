import { useCallback, useEffect, useState } from 'react';
import type { AdminUser } from '../../lib/api';
import { endpoints } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (q) params.set('q', q);
      const data = await endpoints.adminUsers(params.toString());
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string, active: boolean) => {
    try {
      await endpoints.adminUpdateUser(id, { active });
      setMsg(`Usuario ${active ? 'activado' : 'desactivado'}.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al actualizar.');
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-body">Usuarios</h2>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
        <input className="input max-w-sm" placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" />
        <button type="submit" className="btn-secondary">Buscar</button>
      </form>
      {msg && <p className="mb-3 text-sm text-body-muted">{msg}</p>}
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
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Push</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <p className="font-medium text-body">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-body-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.role === 'ADMIN' ? 'border-sev-moderate/30 bg-sev-moderate/15 text-sev-moderate' : 'border-line bg-surface-3 text-body-muted'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.active ? 'border-sev-low/30 bg-sev-low/10 text-sev-low' : 'border-sev-critical/30 bg-sev-critical/10 text-sev-critical'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-body-muted">{u.pushCount}</td>
                    <td className="px-4 py-3 text-xs text-body-muted">
                      {u.location ? `${u.location.latitude.toFixed(2)}, ${u.location.longitude.toFixed(2)}` : 'Sin ubicación'}
                    </td>
                    <td className="px-4 py-3 text-xs text-body-muted">{new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">
                      <button
                        className={u.active ? 'btn-secondary !py-1 text-xs' : 'btn-primary !py-1 text-xs'}
                        onClick={() => void toggle(u.id, !u.active)}
                      >
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
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
