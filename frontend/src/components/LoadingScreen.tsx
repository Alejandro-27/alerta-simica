export default function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-accent/40" />
        <div className="absolute inset-2 rounded-full border-2 border-accent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-accent" />
        </div>
      </div>
      <p className="text-sm text-body-muted" role="status">
        {label}
      </p>
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <svg className="h-10 w-10 text-body-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 className="font-semibold text-body">{title}</h3>
      {body && <p className="max-w-sm text-sm text-body-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 border-sev-critical/40 py-10 text-center">
      <svg className="h-10 w-10 text-sev-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <h3 className="font-semibold text-body">{title}</h3>
      {body && <p className="max-w-sm text-sm text-body-muted">{body}</p>}
      {action}
    </div>
  );
}

export function OfflineNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-sev-moderate/40 bg-sev-moderate/10 px-3 py-2 text-sm text-sev-moderate">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Sin conexión: mostrando la última información disponible.
    </div>
  );
}
