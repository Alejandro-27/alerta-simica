import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/earthquakes', label: 'Terremotos' },
  { to: '/admin/notifications', label: 'Notificaciones' },
  { to: '/admin/sources', label: 'Fuentes' },
  { to: '/admin/config', label: 'Configuración' },
  { to: '/admin/logs', label: 'Logs' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Administración</h1>
          <p className="text-sm text-slate-400">Sesión: {user?.email} (ADMIN)</p>
        </div>
        <NavLink to="/dashboard" className="btn-secondary !py-1.5 text-xs">← Mi panel</NavLink>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Secciones de administración">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive ? 'bg-amber-500 text-seismic-900' : 'bg-seismic-800 text-slate-300 hover:text-white'
              }`
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
