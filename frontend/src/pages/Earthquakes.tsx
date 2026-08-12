import { useCallback, useEffect, useState } from 'react';
import type { EarthquakeRecord, EarthquakeScope, HealthResponse } from '@shared';
import { COLOMBIA_DEPARTMENTS } from '@shared';
import { endpoints } from '../lib/api';
import EarthquakeCard from '../components/EarthquakeCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Spinner } from '../components/LoadingScreen';

interface Filters {
  page: number;
  pageSize: number;
  scope: EarthquakeScope;
  from: string;
  to: string;
  minMagnitude: string;
  source: string;
  department: string;
  depth: string;
}

const DEPTH_OPTIONS = [
  { value: '', label: 'Todas las profundidades' },
  { value: 'superficial', label: 'Superficial (menos de 70 km)' },
  { value: 'intermedia', label: 'Intermedia (70 a 300 km)' },
  { value: 'profunda', label: 'Profunda (más de 300 km)' },
];

const DEFAULT_FILTERS: Filters = {
  page: 1,
  pageSize: 12,
  scope: 'co',
  from: '',
  to: '',
  minMagnitude: '',
  source: '',
  department: '',
  depth: '',
};

function depthParams(depth: string): { minDepth?: string; maxDepth?: string } {
  if (depth === 'superficial') return { maxDepth: '70' };
  if (depth === 'intermedia') return { minDepth: '70', maxDepth: '300' };
  if (depth === 'profunda') return { minDepth: '300' };
  return {};
}

function buildQuery(f: Filters): string {
  const params = new URLSearchParams();
  params.set('page', String(f.page));
  params.set('pageSize', String(f.pageSize));
  params.set('scope', f.scope);
  if (f.from) params.set('from', new Date(`${f.from}T00:00:00`).toISOString());
  if (f.to) params.set('to', new Date(`${f.to}T23:59:59`).toISOString());
  if (f.minMagnitude) params.set('minMagnitude', f.minMagnitude);
  if (f.source) params.set('source', f.source);
  if (f.scope === 'co' && f.department) params.set('department', f.department);
  const dp = depthParams(f.depth);
  if (dp.maxDepth) params.set('maxDepth', dp.maxDepth);
  if (dp.minDepth) params.set('minDepth', dp.minDepth);
  return params.toString();
}

export default function Earthquakes() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<EarthquakeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

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

  useEffect(() => {
    endpoints
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    [filters.from, filters.to, filters.minMagnitude, filters.source, filters.department, filters.depth].filter(Boolean)
      .length;

  const sgcAvailable = health ? health.earthquakeSources.sgc !== 'misconfigured' : true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Historial de sismos</h1>
          <p className="mt-1 text-sm text-slate-400">
            Eventos detectados por SGC y USGS, del más reciente al más antiguo.
          </p>
        </div>
        <span className="chip border-white/10 bg-white/5 text-slate-300">
          {total} sismo{total === 1 ? '' : 's'}
        </span>
      </div>

      {/* Alcance */}
      <div className="mt-6 flex rounded-xl border border-white/5 bg-seismic-850/60 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => update({ scope: 'co', department: '' })}
          className={`flex-1 rounded-lg px-4 py-2 transition ${filters.scope === 'co' ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🇨🇴 Colombia y alrededores
        </button>
        <button
          type="button"
          onClick={() => update({ scope: 'world', department: '' })}
          className={`flex-1 rounded-lg px-4 py-2 transition ${filters.scope === 'world' ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🌎 Todo el mundo
        </button>
      </div>

      {/* Filtros plegables */}
      <form
        className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-seismic-850/60"
        onSubmit={(e) => {
          e.preventDefault();
          void load(filters);
        }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-slate-300 hover:text-white"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          Filtros
          <span className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="badge border-accent/30 bg-accent/15 text-accent">{activeCount} activos</span>
            )}
            <svg className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        {filtersOpen && (
          <div className="grid grid-cols-1 gap-4 border-t border-white/5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-from" className="label">Desde</label>
              <input id="f-from" type="date" className="input" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
            </div>
            <div>
              <label htmlFor="f-to" className="label">Hasta</label>
              <input id="f-to" type="date" className="input" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
            </div>
            <div>
              <label htmlFor="f-minmag" className="label">
                Magnitud mínima: {filters.minMagnitude ? `${filters.minMagnitude} M` : 'Todas'}
              </label>
              <input
                id="f-minmag"
                type="range"
                min="0"
                max="8"
                step="0.5"
                className="w-full accent-[#2dd4bf]"
                value={filters.minMagnitude}
                onChange={(e) => update({ minMagnitude: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="f-depth" className="label">Profundidad</label>
              <select id="f-depth" className="input" value={filters.depth} onChange={(e) => update({ depth: e.target.value })}>
                {DEPTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {filters.scope === 'co' && (
              <div>
                <label htmlFor="f-dept" className="label">Departamento</label>
                <select id="f-dept" className="input" value={filters.department} onChange={(e) => update({ department: e.target.value })}>
                  <option value="">Todos</option>
                  {COLOMBIA_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-source" className="label">Fuente</label>
              <select id="f-source" className="input" value={filters.source} onChange={(e) => update({ source: e.target.value })}>
                <option value="">Todas</option>
                <option value="usgs">USGS</option>
                <option value="sgc" disabled={!sgcAvailable}>
                  {sgcAvailable ? 'SGC (Colombia)' : 'SGC (sin datos configurados)'}
                </option>
                {health && health.earthquakeSources.mock === 'up' && (
                  <option value="mock">Demo (Colombia)</option>
                )}
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
              <button type="submit" className="btn-primary w-full sm:w-auto">Aplicar filtros</button>
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={clearFilters}>Limpiar</button>
            </div>
          </div>
        )}
      </form>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-slate-400"><Spinner /> Cargando…</div>
      ) : error ? (
        <div className="mt-8"><ErrorState title="Error" body={error} /></div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No hay eventos con esos filtros" body="Prueba ampliar las fechas, bajar la magnitud mínima o cambiar el alcance." />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e, i) => (
              <div key={e.id} style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
                <EarthquakeCard event={e} />
              </div>
            ))}
          </div>
          <Pagination page={filters.page} totalPages={totalPages} total={total} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      )}
    </div>
  );
}
