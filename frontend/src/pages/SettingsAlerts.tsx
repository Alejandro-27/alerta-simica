import { useState } from 'react';
import type { AlertSettings } from '@shared';
import { DISCLAIMER_TEXT } from '@shared';
import { useAuth } from '../context/AuthContext';
import { endpoints } from '../lib/api';
import ActivateAlerts from '../components/ActivateAlerts';
import { Spinner } from '../components/LoadingScreen';

export default function SettingsAlerts() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState<AlertSettings>(
    user?.alertSettings ?? {
      enabled: true,
      minimumMagnitude: 4.5,
      alertRadiusKm: 100,
      nearbyAlerts: true,
      nationalAlerts: true,
      soundEnabled: true,
      dailySummary: false,
    },
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<AlertSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await endpoints.updateAlertSettings(settings);
      setSettings(res.alertSettings);
      await refreshUser();
      setMessage('Preferencias de alerta guardadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las preferencias.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-body">Mis alertas</h1>
      <p className="mt-1 text-sm text-body-muted">
        Configura qué eventos te interesan y hasta dónde se considera «cerca de ti».
      </p>

      <div className="card mt-6">
        <h2 className="font-bold text-body">Notificaciones push</h2>
        <p className="mt-1 text-sm text-body-muted">
          Activa las alertas para recibir notificaciones en este dispositivo.
        </p>
        <ActivateAlerts className="mt-3" />
      </div>

      <form className="card mt-6 space-y-5" onSubmit={save}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <label htmlFor="enabled" className="font-semibold text-body">Activar alertas</label>
            <p className="text-xs text-body-muted">Permite evaluar eventos sísmicos para tu cuenta.</p>
          </div>
          <input
            id="enabled"
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="h-5 w-5 accent-[rgb(var(--color-accent))]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="minMag" className="label">Magnitud mínima</label>
            <div className="flex items-center gap-3">
              <input
                id="minMag"
                type="range"
                min="3"
                max="7"
                step="0.5"
                value={settings.minimumMagnitude}
                onChange={(e) => update({ minimumMagnitude: parseFloat(e.target.value) })}
                className="w-full accent-[rgb(var(--color-accent))]"
                aria-valuetext={`${settings.minimumMagnitude}`}
              />
              <span className="w-12 text-right font-bold tabular-nums text-accent">{settings.minimumMagnitude}</span>
            </div>
            <p className="text-xs text-body-faint">Eventos por debajo de esta magnitud no generan alertas.</p>
          </div>
          <div>
            <label htmlFor="radius" className="label">Radio de alerta</label>
            <div className="flex items-center gap-3">
              <input
                id="radius"
                type="range"
                min="25"
                max="500"
                step="25"
                value={settings.alertRadiusKm}
                onChange={(e) => update({ alertRadiusKm: parseInt(e.target.value, 10) })}
                className="w-full accent-[rgb(var(--color-accent))]"
                aria-valuetext={`${settings.alertRadiusKm} km`}
              />
              <span className="w-16 text-right font-bold tabular-nums text-accent">{settings.alertRadiusKm} km</span>
            </div>
            <p className="text-xs text-body-faint">Distancia máxima para considerar un evento «cercano».</p>
          </div>
        </div>

        {[
          { id: 'nearby', label: 'Alertas cercanas', desc: 'Notificaciones para eventos dentro del radio de tu ubicación.', key: 'nearbyAlerts' as const },
          { id: 'national', label: 'Alertas nacionales', desc: 'Notificación informativa para eventos relevantes en el país.', key: 'nationalAlerts' as const },
          { id: 'sound', label: 'Sonido de notificación', desc: 'Usa el sonido del sistema si el sistema operativo lo permite.', key: 'soundEnabled' as const },
          { id: 'summary', label: 'Resumen de actividad sísmica', desc: 'Recibe un resumen periódico de la actividad sísmica.', key: 'dailySummary' as const },
        ].map((o) => (
          <div key={o.id} className="flex items-start justify-between gap-3">
            <div>
              <label htmlFor={o.id} className="font-semibold text-body">{o.label}</label>
              <p className="text-xs text-body-muted">{o.desc}</p>
            </div>
            <input
              id={o.id}
              type="checkbox"
              checked={settings[o.key]}
              onChange={(e) => update({ [o.key]: e.target.checked })}
              className="h-5 w-5 accent-[rgb(var(--color-accent))]"
            />
          </div>
        ))}

        {error && <p className="text-sm text-sev-critical" role="alert">{error}</p>}
        {message && <p className="text-sm text-sev-low" role="status">{message}</p>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy && <Spinner />} Guardar preferencias
        </button>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-body-faint">
        {DISCLAIMER_TEXT} El sonido, el modo silencio, el foco o «No molestar» de tu dispositivo pueden bloquear las notificaciones; no podemos ignorarlos.
      </p>
    </div>
  );
}
