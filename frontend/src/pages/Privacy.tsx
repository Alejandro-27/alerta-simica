export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Política de privacidad</h1>

      <section className="card">
        <h2 className="font-bold text-slate-100">Qué datos guardamos</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li><strong>Cuenta:</strong> nombre, apellido, correo y contraseña cifrada (bcrypt).</li>
          <li><strong>Ubicación (opcional):</strong> solo la última ubicación que compartas, con su precisión. Se usa únicamente para calcular si un evento sísmico está dentro de tu radio de alerta.</li>
          <li><strong>Preferencias de alerta:</strong> magnitud mínima, radio, tipos de alerta.</li>
          <li><strong>Suscripción push:</strong> el endpoint y claves de tu dispositivo para enviarte notificaciones.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Qué NO hacemos</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>No vendemos ni compartimos tus datos con terceros.</li>
          <li>No pedimos ubicación al entrar; solo cuando tú la activas.</li>
          <li>No almacenamos tu historial de ubicaciones: guardamos únicamente la última.</li>
          <li>No mostramos tu ubicación a otros usuarios.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Tus derechos</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li><strong>Eliminar mi ubicación:</strong> en «Ajustes → Mi ubicación».</li>
          <li><strong>Eliminar mi cuenta:</strong> en «Ajustes → Mi perfil». Borra perfil, ubicación y suscripciones push.</li>
          <li><strong>Desactivar notificaciones:</strong> en «Ajustes → Mis alertas» o desde el sistema operativo.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Datos de eventos sísmicos</h2>
        <p className="mt-2 text-sm text-slate-300">
          Los datos sísmicos provienen de fuentes externas públicas (Servicio Geológico Colombiano y USGS). Almacenamos los datos originales de cada evento para auditoría, sin información personal asociada.
        </p>
      </section>
    </div>
  );
}
