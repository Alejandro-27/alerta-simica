import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DISCLAIMER_TEXT } from '@shared';
import { endpoints } from '../lib/api';

function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="AlertaSísmica — inicio">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2">
        <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
          <circle cx="32" cy="32" r="7" fill="rgb(var(--color-accent))" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgb(var(--color-line))" strokeWidth="4" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgb(var(--color-line-strong))" strokeWidth="4" />
          <path d="M20 50 H44" stroke="rgb(var(--color-accent))" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`font-bold tracking-tight text-body ${small ? 'text-base' : 'text-lg'}`}>
        ALERTA<span className="text-accent">SÍSMICA</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';
  const iconLabel = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={toggle}
      title={iconLabel}
      aria-label={iconLabel}
      className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-line-strong hover:bg-surface-3"
    >
      {isDark ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span>{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
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

  const cfg = {
    ok: { label: 'Monitoreo activo', dot: 'bg-accent' },
    degraded: { label: 'Monitoreo parcial', dot: 'bg-sev-moderate' },
    unknown: { label: 'Estado desconocido', dot: 'bg-body-faint' },
  }[state];

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-body-muted">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
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
      <header className="site-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <div className="hidden items-center gap-5 md:flex">
            <MonitoringStatus />
            <nav className="flex items-center gap-1" aria-label="Navegación principal">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-accent' : 'text-body-muted hover:text-body'
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
                  <Link to="/admin" className="text-sm font-medium text-body-muted hover:text-body">
                    Admin
                  </Link>
                )}
                <Link to="/settings/alerts" className="btn-primary !py-1.5 text-xs">
                  Activar alertas
                </Link>
                <Link
                  to="/settings/profile"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-bold text-accent"
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
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-body-muted hover:bg-surface-2"
              aria-expanded={mobileOpen}
              aria-label="Abrir menú"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-line bg-surface px-4 py-4 md:hidden">
            <div className="mb-3"><MonitoringStatus /></div>
            <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-body hover:bg-surface-2"
                >
                  {n.label}
                </NavLink>
              ))}
              {user?.role === 'ADMIN' && (
                <NavLink to="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-body hover:bg-surface-2">
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

      <footer className="border-t border-line bg-surface-2 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Logo small />
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-body-muted" aria-label="Enlaces del pie">
              <Link to="/earthquakes" className="hover:text-body">Historial</Link>
              <Link to="/install" className="hover:text-body">Instalar aplicación</Link>
              <Link to="/privacy" className="hover:text-body">Privacidad</Link>
              <Link to="/terms" className="hover:text-body">Términos</Link>
            </nav>
          </div>
          <p className="max-w-4xl text-xs leading-relaxed text-body-faint">
            {DISCLAIMER_TEXT}
          </p>
          <p className="mt-3 text-xs text-body-faint">
            AlertaSísmica · Monitoreo de eventos sísmicos con fuentes externas (SGC, USGS) · Colombia
          </p>
        </div>
      </footer>
    </div>
  );
}
