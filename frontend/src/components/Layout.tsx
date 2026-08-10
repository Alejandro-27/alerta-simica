import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DISCLAIMER_TEXT } from '@shared';
import { endpoints } from '../lib/api';

function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="AlertaSísmica — inicio">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-seismic-800 ring-1 ring-seismic-600">
        <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
          <circle cx="32" cy="32" r="7" fill="#f59e0b" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="#2c4a7a" strokeWidth="4" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="#1a2a45" strokeWidth="4" />
          <path d="M20 50 H44" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`font-bold tracking-tight text-slate-100 ${small ? 'text-base' : 'text-lg'}`}>
        ALERTA<span className="text-amber-500">SÍSMICA</span>
      </span>
    </Link>
  );
}

function MonitoringStatus() {
  const [state, setState] = useState<'ok' | 'degraded' | 'unknown'>('unknown');
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const h = await endpoints.health();
        if (mounted) setState(h.status === 'ok' ? 'ok' : 'degraded');
      } catch {
        if (mounted) setState('unknown');
      }
    };
    void check();
    const t = setInterval(check, 60000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const config = {
    ok: { label: 'Monitoreo activo', cls: 'text-green-400', dot: 'bg-green-500' },
    degraded: { label: 'Monitoreo parcial', cls: 'text-amber-400', dot: 'bg-amber-500' },
    unknown: { label: 'Estado desconocido', cls: 'text-slate-400', dot: 'bg-slate-500' },
  }[state];

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${config.cls}`}>
      <span className={`relative flex h-2 w-2 ${state === 'ok' ? 'ping-dot' : ''}`}>
        <span className={`absolute inset-0 rounded-full ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
}

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/earthquakes', label: 'Historial' },
  { to: '/dashboard', label: 'Mi panel' },
];

export default function Layout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-seismic-700/60 bg-seismic-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <div className="hidden items-center gap-6 md:flex">
            <MonitoringStatus />
            <nav className="flex items-center gap-1" aria-label="Navegación principal">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-seismic-800 text-amber-400' : 'text-slate-300 hover:text-white'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="text-sm font-medium text-slate-300 hover:text-white">
                    Admin
                  </Link>
                )}
                <Link to="/settings/alerts" className="btn-primary !py-1.5 text-xs">
                  Activar alertas
                </Link>
                <Link
                  to="/settings/profile"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-seismic-700 text-sm font-bold text-amber-400 ring-1 ring-seismic-600"
                  aria-label="Mi perfil"
                >
                  {user.firstName.charAt(0)}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary !py-1.5 text-xs">
                  Iniciar sesión
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 text-xs">
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
          <button
            className="rounded-lg p-2 text-slate-300 hover:bg-seismic-800 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Abrir menú"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-seismic-700/60 bg-seismic-900 px-4 py-4 md:hidden">
            <div className="mb-3"><MonitoringStatus /></div>
            <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-seismic-800"
                >
                  {n.label}
                </NavLink>
              ))}
              {user?.role === 'ADMIN' && (
                <NavLink to="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-seismic-800">
                  Panel de administración
                </NavLink>
              )}
            </nav>
            <div className="mt-3 flex gap-2">
              {user ? (
                <>
                  <Link to="/settings/profile" className="btn-secondary flex-1 !py-2 text-sm">
                    Mi perfil
                  </Link>
                  <Link to="/settings/alerts" className="btn-primary flex-1 !py-2 text-sm">
                    Activar alertas
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary flex-1 !py-2 text-sm">
                    Iniciar sesión
                  </Link>
                  <Link to="/register" className="btn-primary flex-1 !py-2 text-sm">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-seismic-700/60 bg-seismic-950 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Logo small />
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400" aria-label="Enlaces del pie">
              <Link to="/earthquakes" className="hover:text-white">Historial</Link>
              <Link to="/install" className="hover:text-white">Instalar aplicación</Link>
              <Link to="/privacy" className="hover:text-white">Privacidad</Link>
              <Link to="/terms" className="hover:text-white">Términos</Link>
            </nav>
          </div>
          <p className="max-w-4xl text-xs leading-relaxed text-slate-500">
            {DISCLAIMER_TEXT}
          </p>
          <p className="mt-3 text-xs text-slate-600">
            AlertaSísmica · Monitoreo de eventos sísmicos con fuentes externas (SGC, USGS) · Colombia
          </p>
        </div>
      </footer>
    </div>
  );
}
