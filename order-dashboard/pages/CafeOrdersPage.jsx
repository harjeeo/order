import { useEffect, useState } from "react";
import {
  Search01Icon,
  ViewIcon,
  Edit02Icon,
  PrinterIcon,
  CashbackIcon,
  Cancel01Icon,
} from "hugeicons-react";
import { getOrders, updateOrderStatus, cancelOrder, refundOrder, printInvoice, reprintKot } from "../lib/mockApi";

const STATUSES = ["all", "pending", "preparing", "ready", "completed", "cancelled"];
const ORDER_TYPES = ["all", "dine-in", "takeaway", "delivery"];

const STATUS_STYLE = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  preparing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ready: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CafeOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [orderType, setOrderType] = useState("all");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");

  async function refresh() {
    setOrders(await getOrders({ search, status, orderType }));
  }

  useEffect(() => {
    refresh();
  }, [search, status, orderType]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function advanceStatus(order) {
    const flow = ["pending", "preparing", "ready", "completed"];
    const next = flow[flow.indexOf(order.status) + 1];
    if (!next) return;
    await updateOrderStatus(order._id, next);
    refresh();
  }

  async function handleCancel(order) {
    await cancelOrder(order._id);
    refresh();
    setToast(`${order.orderNumber} cancelled.`);
  }

  async function handleRefund(order) {
    await refundOrder(order._id);
    refresh();
    setToast(`${order.orderNumber} refunded.`);
  }

  async function handlePrintInvoice(order) {
    await printInvoice(order._id);
    setToast(`Printing invoice for ${order.orderNumber}…`);
  }

  async function handlePrintKot(order) {
    await reprintKot(order._id);
    setToast(`Printing KOT for ${order.orderNumber}…`);
  }

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">All orders across dine-in, takeaway and delivery.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search01Icon
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer…"
            className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm capitalize outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          className="rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm capitalize outline-none"
        >
          {ORDER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>
        {toast && <span className="ml-auto text-xs text-(--color-accent)">{toast}</span>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Order #</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Table</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Waiter</th>
              <th className="px-3 py-2 font-medium">Items</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Payment</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 font-medium">{o.orderNumber}</td>
                <td className="px-3 py-2 capitalize text-(--color-text-muted)">{o.orderType}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{o.table ?? "-"}</td>
                <td className="px-3 py-2">{o.customer}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{o.waiter}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{o.items.reduce((s, i) => s + i.qty, 0)} items</td>
                <td className="px-3 py-2 tabular-nums">{formatCurrency(o.amount)}</td>
                <td className="px-3 py-2 capitalize text-(--color-text-muted)">{o.paymentStatus}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => advanceStatus(o)}
                    disabled={o.status === "completed" || o.status === "cancelled"}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[o.status]} ${
                      o.status === "completed" || o.status === "cancelled" ? "" : "cursor-pointer"
                    }`}
                    title={o.status === "completed" || o.status === "cancelled" ? "" : "Click to advance"}
                  >
                    {o.status}
                  </button>
                </td>
                <td className="px-3 py-2 text-(--color-text-muted)">{formatTime(o.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setSelected(o)} title="View Order" className="text-(--color-text-muted)">
                      <ViewIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button type="button" title="Edit Order" className="text-(--color-text-muted)">
                      <Edit02Icon size={15} strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => handlePrintKot(o)} title="Print KOT" className="text-(--color-text-muted)">
                      <PrinterIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRefund(o)}
                      title="Refund"
                      disabled={o.paymentStatus !== "paid"}
                      className="text-(--color-text-muted) disabled:opacity-30"
                    >
                      <CashbackIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(o)}
                      title="Cancel"
                      disabled={o.status === "completed" || o.status === "cancelled"}
                      className="text-red-500 disabled:opacity-30"
                    >
                      <Cancel01Icon size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No orders match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.orderNumber}</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-(--color-text-muted)">
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-1 text-xs capitalize text-(--color-text-muted)">
              {selected.orderType} {selected.table ? `· ${selected.table}` : ""} · {selected.customer}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {selected.items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {i.qty}× {i.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-(--color-border) pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(selected.amount)}</span>
            </div>
            <button
              type="button"
              onClick={() => handlePrintInvoice(selected)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              <PrinterIcon size={15} strokeWidth={1.8} />
              Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
