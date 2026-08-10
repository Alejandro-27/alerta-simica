import { DISCLAIMER_TEXT } from '@shared';

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Términos de uso</h1>

      <section className="card">
        <h2 className="font-bold text-slate-100">Naturaleza del servicio</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          AlertaSísmica es una plataforma de información sísmica que consulta fuentes externas (Servicio Geológico Colombiano, USGS) y notifica a sus usuarios sobre eventos reportados. No es un sistema de alerta temprana ni sustituye los sistemas oficiales de gestión del riesgo.
        </p>
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {DISCLAIMER_TEXT}
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Factores que afectan las alertas</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>Disponibilidad y tiempo de publicación de las fuentes sísmicas.</li>
          <li>Conectividad a internet y latencia de red.</li>
          <li>Permisos y configuración de notificaciones del dispositivo y sistema operativo.</li>
          <li>Ubicación del usuario y precisión del GPS.</li>
        </ul>
        <p className="mt-2 text-sm text-slate-400">
          No podemos garantizar que recibirás una alerta antes de percibir un sismo.
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Uso aceptable</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>No uses la plataforma para fines ilegales o que generen pánico público.</li>
          <li>No intentes acceder a datos de otros usuarios ni al panel administrativo sin autorización.</li>
          <li>La cuenta es personal e intransferible.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Datos de demostración</h2>
        <p className="mt-2 text-sm text-slate-300">
          Los eventos de prueba están marcados como «DEMO» y nunca se mezclan con los datos reales. En producción, el modo demo se desactiva.
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold text-slate-100">Cambios en los términos</h2>
        <p className="mt-2 text-sm text-slate-300">
          Podemos actualizar estos términos; los cambios se publicarán en esta página. El uso continuado del servicio implica su aceptación.
        </p>
      </section>
    </div>
  );
}
