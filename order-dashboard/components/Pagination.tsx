import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react";

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="mt-3 flex items-center justify-between text-xs text-(--color-text-muted)">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/10"
        >
          <ArrowLeft01Icon size={14} strokeWidth={1.8} />
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/10"
        >
          <ArrowRight01Icon size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
