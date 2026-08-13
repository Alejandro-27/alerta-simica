import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { endpoints } from '../lib/api';
import { Spinner } from '../components/LoadingScreen';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <p className="text-sm text-sev-critical">Enlace inválido: falta el token de restablecimiento.</p>
          <Link to="/forgot-password" className="btn-secondary mt-4">Solicitar otro enlace</Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await endpoints.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <p className="text-sm text-sev-low">Contraseña actualizada correctamente.</p>
          <Link to="/login" className="btn-primary mt-4">Iniciar sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-body">Nueva contraseña</h1>
      <form className="card mt-6 space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="password" className="label">Nueva contraseña (mínimo 8 caracteres)</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirmar contraseña</label>
          <input id="confirm" type="password" required autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-sev-critical" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy && <Spinner />} Guardar contraseña
        </button>
      </form>
    </div>
  );
}
