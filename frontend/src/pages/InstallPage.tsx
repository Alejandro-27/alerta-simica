import InstallGuide from '../components/InstallGuide';
import ActivateAlerts from '../components/ActivateAlerts';

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Instalar la aplicación</h1>
      <p className="mt-2 text-sm text-slate-400">
        AlertaSísmica es una PWA: se instala como una aplicación nativa y funciona en Android, iOS, Windows y macOS.
      </p>
      <div className="mt-6 space-y-4">
        <InstallGuide />
        <div className="card">
          <h3 className="mb-2 font-bold text-slate-100">Después de instalar</h3>
          <ActivateAlerts />
        </div>
        <div className="card">
          <h3 className="mb-2 font-bold text-slate-100">Requisitos para recibir notificaciones</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li>Aplicación abierta desde la pantalla de inicio (en iOS es obligatorio).</li>
            <li>Permiso de notificaciones concedido para esta aplicación.</li>
            <li>Servidor de push configurado por el administrador (llaves VAPID).</li>
            <li>Conexión a internet cuando llega la alerta.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
