import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../hooks/usePush';
import { useInstall } from '../hooks/useInstall';
import { Spinner } from './LoadingScreen';

/**
 * Botón "Activar alertas" con flujo completo:
 * 1. Pide inicio de sesión si no hay usuario.
 * 2. iOS sin instalar => muestra instrucciones de instalación.
 * 3. Solicita permiso de notificaciones (interacción directa).
 * 4. Registra Service Worker y suscripción push.
 */
export default function ActivateAlerts({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { caps, busy, error, activate, deactivate } = usePush();
  const { isIOS, isInstalled } = useInstall();
  const handleClick = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/settings/alerts' } });
      return;
    }
    if (caps.subscribed || caps.permission === 'granted') {
      await deactivate();
    } else {
      await activate();
    }
  };

  const active = caps.subscribed && caps.permission === 'granted';
  const needsIOSInstall = isIOS && !isInstalled && !caps.subscribed;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void handleClick()}
          disabled={busy}
          className={active ? 'btn-secondary' : 'btn-primary'}
          aria-describedby={needsIOSInstall ? 'install-hint' : undefined}
        >
          {busy && <Spinner />}
          {active ? 'Desactivar alertas' : 'Activar alertas'}
        </button>
        {needsIOSInstall && (
          <Link to="/install" id="install-hint" className="text-sm text-amber-400 underline underline-offset-2">
            Para activar notificaciones en iOS, instala la aplicación primero →
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-2 max-w-md text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {!caps.supported && (
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Tu navegador no soporta notificaciones push. Puedes consultar los eventos desde la aplicación.
        </p>
      )}
      {caps.supported && !caps.serverConfigured && (
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Las notificaciones se activarán cuando el administrador configure el servidor de push (VAPID).
        </p>
      )}
      {caps.permission === 'denied' && !caps.subscribed && (
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Permiso denegado en este dispositivo. Actívalo en los ajustes del navegador (icono de candado → Notificaciones).
        </p>
      )}
      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        Las notificaciones dependen de la conectividad, la configuración del dispositivo y el sistema operativo. El modo silencio, «No molestar» o el foco pueden bloquearlas.
      </p>
    </div>
  );
}
