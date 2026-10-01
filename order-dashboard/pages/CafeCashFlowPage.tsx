import { useEffect, useState } from "react";
import { Coins01Icon, PlusSignIcon, MinusSignIcon, Cancel01Icon, Delete02Icon } from "hugeicons-react";
import { getCashMovements, createCashMovement, deleteCashMovement } from "../lib/api";
import { formatCurrency, formatDateTime } from "../lib/format";

export default function CafeCashFlowPage() {
  const [movements, setMovements] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(null); // "topup" | "withdrawal" | null
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await getCashMovements({ type: filter, pageSize: 50 });
    setMovements(result.items);
  }

  useEffect(() => {
    refresh();
  }, [filter]);

  function openForm(type) {
    setShowForm(type);
    setAmount("");
    setReason("");
    setFormError("");
  }

  async function handleSave() {
    const value = Number(amount);
    if (!value || value <= 0) {
      setFormError("Enter a positive amount.");
      return;
    }
    setSaving(true);
    try {
      await createCashMovement(showForm, value, reason);
      setShowForm(null);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not record this");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(movement) {
    await deleteCashMovement(movement._id);
    refresh();
  }

  const totalTopUps = movements.filter((m) => m.type === "topup").reduce((s, m) => s + m.amount, 0);
  const totalWithdrawals = movements.filter((m) => m.type === "withdrawal").reduce((s, m) => s + m.amount, 0);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Coins01Icon size={20} strokeWidth={1.8} />
            Cash Flow
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Float added to or taken out of the till — separate from expenses and sales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openForm("topup")}
            className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium"
          >
            <PlusSignIcon size={14} strokeWidth={1.8} />
            Cash Top-Up
          </button>
          <button
            type="button"
            onClick={() => openForm("withdrawal")}
            className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
          >
            <MinusSignIcon size={14} strokeWidth={1.8} />
            Withdrawal
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-(--color-border) px-3 py-2 text-sm">
          <span className="text-(--color-text-muted)">Top-Ups:</span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalTopUps)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-(--color-border) px-3 py-2 text-sm">
          <span className="text-(--color-text-muted)">Withdrawals:</span>
          <span className="font-semibold tabular-nums text-red-500">{formatCurrency(totalWithdrawals)}</span>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-(--color-border) bg-transparent px-2 py-2 text-sm outline-none"
        >
          <option value="all">All movements</option>
          <option value="topup">Top-Ups only</option>
          <option value="withdrawal">Withdrawals only</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium">By</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 text-(--color-text-muted)">{formatDateTime(m.createdAt)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.type === "topup"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {m.type === "topup" ? "Top-Up" : "Withdrawal"}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(m.amount)}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{m.reason || "-"}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{m.createdBy || "-"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={14} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No cash movements recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{showForm === "topup" ? "Cash Top-Up" : "Cash Withdrawal"}</h2>
              <button
                type="button"
                onClick={() => setShowForm(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">Amount (₹)</span>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">Reason (optional)</span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={showForm === "topup" ? "e.g. opening float" : "e.g. manager's cash pickup"}
                  className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
            </div>
            {formError && <div className="mt-2 text-xs text-red-500">{formError}</div>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : showForm === "topup" ? "Add to Till" : "Withdraw from Till"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
