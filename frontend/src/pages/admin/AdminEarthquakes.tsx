import { useCallback, useEffect, useState } from 'react';
import type { AdminEarthquake } from '../../lib/api';
import { endpoints } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

export default function AdminEarthquakes() {
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('');
  const [demo, setDemo] = useState<'all' | 'true' | 'false'>('false');
  const [items, setItems] = useState<AdminEarthquake[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (source) params.set('source', source);
      if (demo !== 'all') params.set('demo', demo);
      const data = await endpoints.adminEarthquakes(params.toString());
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar terremotos.');
    } finally {
      setLoading(false);
    }
  }, [page, source, demo]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este evento sísmico? Esta acción no se puede deshacer.')) return;
    try {
      await endpoints.adminDeleteEarthquake(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-slate-100">Terremotos</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input max-w-[200px]" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} aria-label="Filtrar por fuente">
          <option value="">Todas las fuentes</option>
          <option value="sgc">SGC</option>
          <option value="usgs">USGS</option>
          <option value="mock">Mock (demo)</option>
        </select>
        <select className="input max-w-[200px]" value={demo} onChange={(e) => { setDemo(e.target.value as typeof demo); setPage(1); }} aria-label="Filtrar por demo">
          <option value="false">Solo reales</option>
          <option value="true">Solo demo</option>
          <option value="all">Todos</option>
        </select>
      </div>
      {error && <ErrorState title="Error" body={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-seismic-700/60 bg-seismic-850">
            <table className="w-full text-left text-sm">
              <thead className="bg-seismic-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mag</th>
                  <th className="px-4 py-3">Lugar</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Detectado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-t border-seismic-700/50">
                    <td className="px-4 py-3 font-black text-amber-400">{e.magnitude.toFixed(1)}</td>
                    <td className="px-4 py-3 text-slate-200">{e.place}</td>
                    <td className="px-4 py-3">
                      <span className="badge border-seismic-600 bg-seismic-800 text-slate-300">{e.source.toUpperCase()}</span>
                      {e.demo && <span className="badge ml-1 border-purple-500/30 bg-purple-500/15 text-purple-300">DEMO</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(e.eventTime).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(e.firstDetectedAt).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3">
                      <button className="btn-danger !py-1 text-xs" onClick={() => void remove(e.id)}>Eliminar</button>
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
