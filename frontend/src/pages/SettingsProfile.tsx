import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { endpoints } from '../lib/api';
import { Spinner } from '../components/LoadingScreen';

export default function SettingsProfile() {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    password: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await endpoints.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        ...(form.password ? { password: form.password } : {}),
      });
      setMessage('Perfil actualizado.');
      setForm((f) => ({ ...f, password: '' }));
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await endpoints.deleteAccount();
      await logout();
      window.location.href = '/';
    } catch {
      setError('No se pudo eliminar la cuenta.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-body">Mi perfil</h1>
      <p className="mt-1 text-sm text-body-muted">Datos de tu cuenta en AlertaSísmica.</p>

      <form className="card mt-6 space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="label">Nombre</label>
            <input id="firstName" required minLength={2} className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="lastName" className="label">Apellido</label>
            <input id="lastName" required minLength={2} className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="label">Correo electrónico</label>
          <input id="email" type="email" disabled className="input opacity-60" value={user?.email ?? ''} aria-describedby="email-note" />
          <p id="email-note" className="mt-1 text-xs text-body-faint">El correo no se puede cambiar desde aquí.</p>
        </div>
        <div>
          <label htmlFor="phone" className="label">Teléfono (opcional)</label>
          <input id="phone" type="tel" className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="password" className="label">Nueva contraseña (opcional)</label>
          <input id="password" type="password" minLength={8} autoComplete="new-password" className="input" placeholder="Déjalo vacío para no cambiarla" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        {error && <p className="text-sm text-sev-critical" role="alert">{error}</p>}
        {message && <p className="text-sm text-sev-low" role="status">{message}</p>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy && <Spinner />} Guardar cambios
        </button>
      </form>

      <div className="card mt-6 border-sev-critical/40">
        <h2 className="font-bold text-sev-critical">Zona de peligro</h2>
        <p className="mt-1 text-sm text-body-muted">
          Eliminar tu cuenta borra tu perfil, tu ubicación y tus suscripciones de notificación. Esta acción no se puede deshacer.
        </p>
        {!confirmingDelete ? (
          <button className="btn-danger mt-3" onClick={() => setConfirmingDelete(true)}>
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-danger" disabled={busy} onClick={() => void deleteAccount()}>
              {busy && <Spinner />} Confirmar eliminación
            </button>
            <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
