import { useEffect, useState } from "react";
import { Moon02Icon } from "hugeicons-react";
import { getDayEndPreview, closeDayEnd, getDayEndHistory } from "../lib/api";

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CafeDayEndPage() {
  const [preview, setPreview] = useState(null);
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [lastClosed, setLastClosed] = useState(null);

  async function refreshPreview() {
    setPreview(await getDayEndPreview());
  }

  async function refreshHistory() {
    const result = await getDayEndHistory({ pageSize: 10 });
    setHistory(result.items);
  }

  useEffect(() => {
    refreshPreview();
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!lastClosed) return;
    const t = setTimeout(() => setLastClosed(null), 5000);
    return () => clearTimeout(t);
  }, [lastClosed]);

  const difference = preview && countedCash !== "" ? Number(countedCash) - preview.expectedCash : null;

  async function handleClose() {
    setError("");
    setClosing(true);
    try {
      const result = await closeDayEnd(Number(countedCash) || 0, notes);
      setLastClosed(result);
      setCountedCash("");
      setNotes("");
      await refreshPreview();
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the day");
    } finally {
      setClosing(false);
    }
  }

  if (!preview) return null;

  const cards = [
    { label: "Success Orders", count: preview.successOrders, amount: preview.successAmount },
    { label: "Cancelled Orders", count: preview.cancelledOrders, amount: preview.cancelledAmount },
    { label: "Complimentary Orders", count: preview.complimentaryOrders, amount: preview.complimentaryAmount },
    { label: "Sales Return Orders", count: preview.salesReturnOrders, amount: preview.salesReturnAmount },
    { label: "Due Orders", count: preview.dueOrders, amount: preview.dueAmount },
    { label: "Online Orders", count: preview.onlineOrders, amount: preview.onlineAmount },
  ];

  return (
    <div className="px-8 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Moon02Icon size={20} strokeWidth={1.8} />
        Day End
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">
        Since last closing: {formatDateTime(preview.periodStart)} → {formatDateTime(preview.periodEnd)}
      </p>

      {lastClosed && (
        <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          Day closed. Difference: {lastClosed.difference > 0 ? "+" : ""}
          {formatCurrency(lastClosed.difference)}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-(--color-border) p-4">
            <div className="text-xs text-(--color-text-muted)">{c.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(c.amount)}</div>
            <div className="mt-0.5 text-xs text-(--color-text-muted)">
              {c.count} order{c.count === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-md rounded-xl border border-(--color-border) p-5">
        <h2 className="text-sm font-semibold">Cash Reconciliation</h2>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-(--color-text-muted)">Expected Cash</span>
          <span className="font-medium tabular-nums">{formatCurrency(preview.expectedCash)}</span>
        </div>
        <p className="mt-1 text-[11px] text-(--color-text-muted)">
          Cash-method sales minus cash-paid expenses for this period. Split payments aren't broken out, so verify
          the drawer if any orders were settled with a split method.
        </p>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-(--color-text-muted)">Counted Cash</span>
          <input
            type="number"
            min={0}
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </label>

        {difference !== null && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-(--color-text-muted)">Difference</span>
            <span
              className={`font-semibold tabular-nums ${
                difference === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {difference > 0 ? "+" : ""}
              {formatCurrency(difference)}
            </span>
          </div>
        )}

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-(--color-text-muted)">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. short by ₹20, counted twice"
            className="resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </label>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleClose}
          disabled={closing || countedCash === ""}
          className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {closing ? "Closing…" : "Close Day"}
        </button>
      </div>

      <h2 className="mt-8 text-sm font-medium text-(--color-text-muted)">Closing History</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Success Sales</th>
              <th className="px-3 py-2 font-medium">Expected Cash</th>
              <th className="px-3 py-2 font-medium">Counted Cash</th>
              <th className="px-3 py-2 font-medium">Difference</th>
              <th className="px-3 py-2 font-medium">Closed By</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 text-(--color-text-muted)">
                  {formatDateTime(h.periodStart)} – {formatDateTime(h.periodEnd)}
                </td>
                <td className="px-3 py-2 tabular-nums">{formatCurrency(h.successAmount)}</td>
                <td className="px-3 py-2 tabular-nums">{formatCurrency(h.expectedCash)}</td>
                <td className="px-3 py-2 tabular-nums">{formatCurrency(h.countedCash)}</td>
                <td
                  className={`px-3 py-2 tabular-nums font-medium ${
                    h.difference === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`}
                >
                  {h.difference > 0 ? "+" : ""}
                  {formatCurrency(h.difference)}
                </td>
                <td className="px-3 py-2 text-(--color-text-muted)">{h.closedBy || "-"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No closings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
