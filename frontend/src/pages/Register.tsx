import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Spinner } from '../components/LoadingScreen';
import { RedirectIfAuthed } from '../components/RequireAuth';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      navigate('/settings/alerts');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-extrabold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tu ubicación es opcional: la usarás solo para recibir alertas cercanas.
        </p>
        <form className="card mt-6 space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="label">Nombre</label>
              <input id="firstName" required minLength={2} className="input" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div>
              <label htmlFor="lastName" className="label">Apellido</label>
              <input id="lastName" required minLength={2} className="input" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="label">Correo electrónico</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label htmlFor="password" className="label">Contraseña (mínimo 8 caracteres)</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirmar contraseña</label>
            <input id="confirm" type="password" required autoComplete="new-password" className="input" value={form.confirm} onChange={set('confirm')} />
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Spinner />} Crear cuenta
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-amber-400 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </RedirectIfAuthed>
  );
}
