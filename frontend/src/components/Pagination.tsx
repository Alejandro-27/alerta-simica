interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    const start = Math.max(1, Math.min(page - 3, totalPages - 6));
    return start + i;
  });

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginación">
      <p className="text-xs text-body-faint">
        {total} resultado{total === 1 ? '' : 's'} · página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          ←
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              p === page ? 'bg-accent text-white' : 'text-body-muted hover:bg-surface-2'
            }`}
          >
            {p}
          </button>
        ))}
        <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
          →
        </button>
      </div>
    </nav>
  );
}
