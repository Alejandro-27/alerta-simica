import { useState } from 'react';
import { useInstall } from '../hooks/useInstall';
import { usePush } from '../hooks/usePush';
import { Spinner } from './LoadingScreen';

/**
 * Pantalla/sección "Instalar aplicación":
 * - Android/desktop: instala la PWA directamente.
 * - iOS: instrucciones paso a paso (Safari → Compartir → Añadir a pantalla de inicio).
 */
export default function InstallGuide({ compact = false }: { compact?: boolean }) {
  const install = useInstall();
  const { caps, busy, activate } = usePush();
  const [installing, setInstalling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleInstall = async () => {
    setInstalling(true);
    setMsg(null);
    const ok = await install.promptInstall();
    setInstalling(false);
    if (ok) setMsg('Aplicación instalada.');
    else if (install.isIOS && !install.isInstalled)
      setMsg('En iOS usa Safari: pulsa Compartir → Añadir a pantalla de inicio.');
  };

  return (
    <div className="card">
      <h3 className="mb-1 text-lg font-bold text-slate-100">Instalar aplicación</h3>
      <p className="mb-4 text-sm text-slate-400">
        Instala AlertaSísmica para abrirla como una app nativa y recibir notificaciones.
      </p>

      {install.isInstalled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          ✓ Aplicación instalada
        </div>
      )}

      {install.isIOS && !install.isInstalled && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-200">En iPhone/iPad:</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
            <li>Abre esta página en <strong>Safari</strong>.</li>
            <li>Pulsa el botón <strong>Compartir</strong> <span className="text-slate-500">(cuadro con flecha ↑)</span>.</li>
            <li>Selecciona <strong>«Añadir a pantalla de inicio»</strong>.</li>
            <li>Abre la aplicación desde el nuevo icono.</li>
            <li>Pulsa <strong>«Activar alertas»</strong> para conceder permisos de notificación.</li>
          </ol>
        </div>
      )}

      {!install.isInstalled && !install.isIOS && (
        <button
          onClick={() => void handleInstall()}
          disabled={installing || !install.canInstall}
          className="btn-primary"
        >
          {installing && <Spinner />}
          {install.canInstall ? 'Instalar aplicación' : 'Usar desde el navegador'}
        </button>
      )}

      {install.isInstalled && (
        <div>
          <button
            onClick={() => void activate()}
            disabled={busy}
            className={caps.subscribed ? 'btn-secondary' : 'btn-primary'}
          >
            {busy && <Spinner />}
            {caps.subscribed ? 'Notificaciones activadas' : 'Activar notificaciones'}
          </button>
          {msg && <p className="mt-2 text-sm text-green-400">{msg}</p>}
          {!compact && caps.isIOS && (
            <p className="mt-3 text-xs text-slate-500">
              En iOS, los permisos de notificación solo se pueden conceder desde la aplicación instalada.
            </p>
          )}
        </div>
      )}

      {!install.isInstalled && install.isIOS && (
        <p className="mt-3 text-xs text-slate-500">
          Las notificaciones en iOS requieren la aplicación instalada y el permiso concedido desde ella.
        </p>
      )}
    </div>
  );
}
