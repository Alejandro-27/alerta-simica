import { useCallback, useEffect, useState } from 'react';
import type { AlertConfigurationPublic } from '@shared';
import { endpoints } from '../../lib/api';
import { ErrorState, Spinner } from '../../components/LoadingScreen';

export default function AdminConfig() {
  const [config, setConfig] = useState<AlertConfigurationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushTest, setPushTest] = useState({ title: '', body: '', userId: '' });
  const [pushResult, setPushResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await endpoints.adminConfig();
      setConfig(data.config);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar configuración.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!config) return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await endpoints.adminUpdateConfig({
        minimumMagnitude: config.minimumMagnitude,
        maximumDepth: config.maximumDepth,
        alertRadiusKm: config.alertRadiusKm,
        highMagnitudeThreshold: config.highMagnitudeThreshold,
        enabled: config.enabled,
        country: config.country,
        sources: config.sources,
        pollIntervalSeconds: config.pollIntervalSeconds,
      });
      setConfig(data.config);
      setMsg('Configuración guardada. El siguiente ciclo del scheduler la aplicará.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPushResult(null);
    try {
      const r = await endpoints.adminPushTest({
        title: pushTest.title || 'Prueba de notificación',
        body: pushTest.body || 'Si recibes esto, las notificaciones funcionan.',
        userId: pushTest.userId || undefined,
      });
      setPushResult(`Push de prueba: ${r.delivered} entregado(s), ${r.failed} fallido(s), de ${r.targets} suscripción(es).`);
    } catch (e) {
      setPushResult(e instanceof Error ? e.message : 'Error al enviar push de prueba.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-body-muted"><Spinner /> Cargando…</div>;
  if (error || !config) return <ErrorState title="Error" body={error ?? 'Sin configuración'} />;

  const toggleSource = (name: string) => {
    setConfig((c) =>
      c
        ? {
            ...c,
            sources: { ...c.sources, [name]: { enabled: !(c.sources[name]?.enabled ?? true) } },
          }
        : c,
    );
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-body">Motor de alertas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="minMag" className="label">Magnitud mínima global</label>
            <input id="minMag" type="number" min="0" max="10" step="0.1" className="input" value={config.minimumMagnitude}
              onChange={(e) => setConfig({ ...config, minimumMagnitude: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label htmlFor="maxDepth" className="label">Profundidad máxima (km)</label>
            <input id="maxDepth" type="number" min="0" className="input" value={config.maximumDepth ?? ''}
              onChange={(e) => setConfig({ ...config, maximumDepth: e.target.value === '' ? null : parseFloat(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="radius" className="label">Radio de alerta (km)</label>
            <input id="radius" type="number" min="1" className="input" value={config.alertRadiusKm}
              onChange={(e) => setConfig({ ...config, alertRadiusKm: parseInt(e.target.value, 10) || 1 })} />
          </div>
          <div>
            <label htmlFor="highMag" className="label">Umbral para nivel «Posible afectación»</label>
            <input id="highMag" type="number" min="0" max="10" step="0.1" className="input" value={config.highMagnitudeThreshold}
              onChange={(e) => setConfig({ ...config, highMagnitudeThreshold: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label htmlFor="interval" className="label">Intervalo de consulta (segundos)</label>
            <input id="interval" type="number" min="10" max="3600" className="input" value={config.pollIntervalSeconds}
              onChange={(e) => setConfig({ ...config, pollIntervalSeconds: parseInt(e.target.value, 10) || 30 })} />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--color-accent))]" checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
              <span className="text-sm font-medium text-body">Motor de alertas activo</span>
            </label>
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={() => void save()} disabled={busy}>
          {busy && <Spinner />} Guardar configuración
        </button>
        {msg && <p className="mt-2 text-sm text-sev-low">{msg}</p>}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-body">Fuentes sísmicas</h2>
        <div className="space-y-2">
          {Object.entries(config.sources).map(([name, s]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3">
              <div>
                <p className="font-semibold text-body">{name === 'sgc' ? 'SGC (Servicio Geológico Colombiano)' : name === 'usgs' ? 'USGS' : 'Mock (demo)'}</p>
                <p className="text-xs text-body-muted">{s.enabled ? 'Consultada cada ciclo del scheduler' : 'Pausada'}</p>
              </div>
              <button className={s.enabled ? 'btn-secondary !py-1.5 text-xs' : 'btn-primary !py-1.5 text-xs'} onClick={() => toggleSource(name)}>
                {s.enabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-body">Enviar push de prueba</h2>
        <form className="space-y-3" onSubmit={sendTest}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pt-title" className="label">Título</label>
              <input id="pt-title" className="input" placeholder="Prueba de notificación" value={pushTest.title} onChange={(e) => setPushTest((t) => ({ ...t, title: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="pt-body" className="label">Mensaje</label>
              <input id="pt-body" className="input" placeholder="Si recibes esto, las notificaciones funcionan." value={pushTest.body} onChange={(e) => setPushTest((t) => ({ ...t, body: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="pt-user" className="label">Usuario específico (id, opcional — vacío = todos)</label>
            <input id="pt-user" className="input" placeholder="Dejar vacío envía a todos los usuarios con push" value={pushTest.userId} onChange={(e) => setPushTest((t) => ({ ...t, userId: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner />} Enviar push de prueba
          </button>
          {pushResult && <p className="text-sm text-body-muted">{pushResult}</p>}
        </form>
      </div>
    </div>
  );
}
