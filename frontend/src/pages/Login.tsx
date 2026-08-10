import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Spinner } from '../components/LoadingScreen';
import { RedirectIfAuthed } from '../components/RequireAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-extrabold text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-400">Accede para configurar tus alertas y recibir notificaciones.</p>
        <form className="card mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">{error}</p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Spinner />} Entrar
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:justify-between">
          <Link to="/forgot-password" className="text-amber-400 hover:underline">¿Olvidaste tu contraseña?</Link>
          <span>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-amber-400 hover:underline">Regístrate</Link>
          </span>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
