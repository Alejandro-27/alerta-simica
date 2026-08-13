import { useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '../lib/api';
import { Spinner } from '../components/LoadingScreen';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await endpoints.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar el restablecimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-body">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-body-muted">
        Ingresa tu correo y te enviaremos un enlace para restablecer la contraseña.
      </p>
      {sent ? (
        <div className="card mt-6">
          <p className="text-sm text-sev-low">
            Si el correo existe, recibirás un enlace de restablecimiento.
          </p>
          <p className="mt-2 text-xs text-body-muted">
            En desarrollo, el enlace se registra en los logs del servidor.
          </p>
          <Link to="/login" className="btn-secondary mt-4">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form className="card mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="label">Correo electrónico</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-sev-critical" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Spinner />} Enviar enlace
          </button>
        </form>
      )}
    </div>
  );
}
