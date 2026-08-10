import { useCallback, useEffect, useState } from 'react';
import type { EarthquakeRecord } from '@shared';
import { endpoints } from '../lib/api';
import EarthquakeCard from '../components/EarthquakeCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Spinner } from '../components/LoadingScreen';

interface Filters {
  page: number;
  pageSize: number;
  from: string;
  to: string;
  minMagnitude: string;
  source: string;
  department: string;
  maxDepth: string;
}

const DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá',
  'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
  'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
  'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.',
];

const DEFAULT_FILTERS: Filters = {
  page: 1,
  pageSize: 15,
  from: '',
  to: '',
  minMagnitude: '',
  source: '',
  department: '',
  maxDepth: '',
};

function buildQuery(f: Filters): string {
  const params = new URLSearchParams();
  params.set('page', String(f.page));
  params.set('pageSize', String(f.pageSize));
  if (f.from) params.set('from', new Date(f.from).toISOString());
  if (f.to) params.set('to', new Date(f.to).toISOString());
  if (f.minMagnitude) params.set('minMagnitude', f.minMagnitude);
  if (f.source) params.set('source', f.source);
  if (f.department) params.set('department', f.department);
  if (f.maxDepth) params.set('maxDepth', f.maxDepth);
  return params.toString();
}

export default function Earthquakes() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<EarthquakeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await endpoints.earthquakes(buildQuery(f));
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('No se pudo consultar el historial sísmico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Historial de terremotos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Eventos detectados por el Servicio Geológico Colombiano y el USGS, ordenados del más reciente al más antiguo.
      </p>

      {/* Filtros */}
      <form
        className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-seismic-700/60 bg-seismic-850 p-4 md:grid-cols-3 lg:grid-cols-7"
        onSubmit={(e) => {
          e.preventDefault();
          void load(filters);
        }}
      >
        <div>
          <label htmlFor="f-from" className="label">Desde</label>
          <input id="f-from" type="date" className="input" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
        </div>
        <div>
          <label htmlFor="f-to" className="label">Hasta</label>
          <input id="f-to" type="date" className="input" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
        </div>
        <div>
          <label htmlFor="f-minmag" className="label">Magnitud mín.</label>
          <input id="f-minmag" type="number" min="0" max="10" step="0.1" className="input" placeholder="4.5" value={filters.minMagnitude} onChange={(e) => update({ minMagnitude: e.target.value })} />
        </div>
        <div>
          <label htmlFor="f-depth" className="label">Profundidad máx. (km)</label>
          <input id="f-depth" type="number" min="0" className="input" placeholder="200" value={filters.maxDepth} onChange={(e) => update({ maxDepth: e.target.value })} />
        </div>
        <div>
          <label htmlFor="f-source" className="label">Fuente</label>
          <select id="f-source" className="input" value={filters.source} onChange={(e) => update({ source: e.target.value })}>
            <option value="">Todas</option>
            <option value="sgc">SGC (Colombia)</option>
            <option value="usgs">USGS</option>
          </select>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="f-dept" className="label">Departamento</label>
          <select id="f-dept" className="input" value={filters.department} onChange={(e) => update({ department: e.target.value })}>
            <option value="">Todos</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">Filtrar</button>
        </div>
      </form>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
      ) : error ? (
        <div className="mt-8"><ErrorState title="Error" body={error} /></div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No hay eventos con esos filtros" body="Prueba ampliar las fechas o reducir la magnitud mínima." />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <EarthquakeCard key={e.id} event={e} />
            ))}
          </div>
          <Pagination page={filters.page} totalPages={totalPages} total={total} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      )}
    </div>
  );
}
