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
      <h3 className="mb-1 text-lg font-bold text-body">Instalar aplicación</h3>
      <p className="mb-4 text-sm text-body-muted">
        Instala AlertaSísmica para abrirla como una app nativa y recibir notificaciones.
      </p>

      {install.isInstalled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-sev-low/30 bg-sev-low/10 px-3 py-2 text-sm text-sev-low">
          ✓ Aplicación instalada
        </div>
      )}

      {install.isIOS && !install.isInstalled && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-body">En iPhone/iPad:</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-body-muted">
            <li>Abre esta página en <strong>Safari</strong>.</li>
            <li>Pulsa el botón <strong>Compartir</strong> <span className="text-body-faint">(cuadro con flecha ↑)</span>.</li>
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
          {msg && <p className="mt-2 text-sm text-sev-low">{msg}</p>}
          {!compact && caps.isIOS && (
            <p className="mt-3 text-xs text-body-faint">
              En iOS, los permisos de notificación solo se pueden conceder desde la aplicación instalada.
            </p>
          )}
        </div>
      )}

      {!install.isInstalled && install.isIOS && (
        <p className="mt-3 text-xs text-body-faint">
          Las notificaciones en iOS requieren la aplicación instalada y el permiso concedido desde ella.
        </p>
      )}
    </div>
  );
}
