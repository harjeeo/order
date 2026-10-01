import { useEffect, useState } from "react";
import { CashbackIcon, Cancel01Icon } from "hugeicons-react";
import { getDueOrders, completePayment } from "../lib/api";

const SETTLE_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "upi", label: "UPI" },
  { key: "other", label: "Other" },
];

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

export default function CafeDuePaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [settling, setSettling] = useState(null); // order being settled
  const [method, setMethod] = useState("cash");
  const [customerPaid, setCustomerPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function refresh() {
    setOrders(await getDueOrders());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function openSettle(order) {
    setSettling(order);
    setMethod("cash");
    setCustomerPaid("");
    setError("");
  }

  async function handleSettle() {
    if (!settling) return;
    setSaving(true);
    setError("");
    try {
      await completePayment(settling._id, {
        subtotal: settling.amount,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        total: settling.amount,
        method,
        tipAmount: 0,
      });
      setToast(`${settling.orderNumber} settled.`);
      setSettling(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not settle this order");
    } finally {
      setSaving(false);
    }
  }

  const total = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="px-8 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <CashbackIcon size={20} strokeWidth={1.8} />
        Due Payments
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">
        Orders that were served and billed but settled as "Due" — collect payment here once it comes in.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-(--color-border) px-3 py-2 text-sm">
          <span className="text-(--color-text-muted)">Total Due:</span>
          <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(total)}</span>
        </div>
        {toast && <span className="text-xs text-(--color-accent)">{toast}</span>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Order #</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 font-medium">{o.orderNumber}</td>
                <td className="px-3 py-2">{o.customer}</td>
                <td className="px-3 py-2 capitalize text-(--color-text-muted)">
                  {o.orderType}
                  {o.table ? ` · ${o.table}` : ""}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(o.amount)}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{formatDateTime(o.createdAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openSettle(o)}
                    className="rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Settle
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No due payments pending.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {settling && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !saving && setSettling(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Settle {settling.orderNumber} — {formatCurrency(settling.amount)}
              </h2>
              <button
                type="button"
                onClick={() => setSettling(null)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) disabled:opacity-50 dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-4 text-xs font-medium text-(--color-text-muted)">Payment Type</div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {SETTLE_METHODS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`rounded-md border py-2 text-xs font-medium transition-colors ${
                    method === key
                      ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                      : "border-(--color-border) text-(--color-text-muted)"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {method === "cash" && (
              <div className="mt-4">
                <label className="text-xs text-(--color-text-muted)">Customer Paid</label>
                <input
                  type="number"
                  min={0}
                  value={customerPaid}
                  onChange={(e) => setCustomerPaid(e.target.value)}
                  placeholder={String(settling.amount)}
                  className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
                {customerPaid !== "" && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-(--color-text-muted)">Return to Customer</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        Number(customerPaid) < settling.amount ? "text-red-500" : ""
                      }`}
                    >
                      {formatCurrency(Math.max(0, Number(customerPaid) - settling.amount))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSettling(null)}
                disabled={saving}
                className="flex-1 rounded-md border border-(--color-border) py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={saving}
                className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Settling…" : "Settle & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
