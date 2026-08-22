import { useEffect, useState } from "react";
import {
  Search01Icon,
  ViewIcon,
  Edit02Icon,
  PrinterIcon,
  CashbackIcon,
  Cancel01Icon,
  Add01Icon,
  MinusSignIcon,
  Delete02Icon,
} from "hugeicons-react";
import { getOrders, updateOrderStatus, cancelOrder, refundOrder, updateOrder, printInvoice, reprintKot } from "../lib/api";
import { buildKotHtml, buildInvoiceHtml, printHtml } from "../lib/print";
import Pagination from "../components/Pagination";
import { useTranslation } from "../lib/i18n";
import { onOutletEvent } from "../lib/socket";

const PAGE_SIZE = 20;

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
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [orderType, setOrderType] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [toast, setToast] = useState("");

  async function refresh() {
    const result = await getOrders({ search, status, orderType, page, pageSize: PAGE_SIZE });
    setOrders(result.items);
    setTotal(result.total);
  }

  useEffect(() => {
    refresh();
  }, [search, status, orderType, page]);

  // Live updates — a new order, status change, cancellation or payment
  // anywhere in this outlet refetches the current page instead of staff
  // needing to hit refresh.
  useEffect(() => onOutletEvent("orders:changed", refresh), [search, status, orderType, page]);

  useEffect(() => {
    setPage(1);
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
    printHtml(
      buildInvoiceHtml({
        invoiceNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        total: order.amount,
      })
    );
    setToast(`Printing invoice for ${order.orderNumber}…`);
  }

  async function handlePrintKot(order) {
    await reprintKot(order._id);
    printHtml(
      buildKotHtml({
        orderNumber: order.orderNumber,
        table: order.table,
        orderType: order.orderType,
        items: order.items,
      })
    );
    setToast(`Printing KOT for ${order.orderNumber}…`);
  }

  function openEdit(order) {
    setEditing(order);
    setEditForm({
      table: order.table ?? "",
      customer: order.customer,
      waiter: order.waiter,
      amount: String(order.amount),
      items: order.items.map((i) => ({ ...i })),
    });
  }

  function updateEditQty(idx, delta) {
    setEditForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item)),
    }));
  }

  function removeEditItem(idx) {
    setEditForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function handleSaveEdit() {
    if (!editing || !editForm) return;
    await updateOrder(editing._id, {
      table: editForm.table || null,
      customer: editForm.customer,
      waiter: editForm.waiter,
      amount: Number(editForm.amount) || 0,
      items: editForm.items,
    });
    setEditing(null);
    setEditForm(null);
    refresh();
    setToast(`${editing.orderNumber} updated.`);
  }

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold">{t("orders.title")}</h1>
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
              <th className="px-3 py-2 font-medium">{t("orders.orderNumber")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.type")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.table")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.customer")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.waiter")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.items")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.amount")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.payment")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.status")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.time")}</th>
              <th className="px-3 py-2 font-medium">{t("orders.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 font-medium">
                  {o.orderNumber}
                  {o.source === "customer" && (
                    <span className="ml-1.5 rounded-full bg-(--color-accent)/10 px-1.5 py-0.5 text-[10px] font-normal text-(--color-accent)">
                      QR
                    </span>
                  )}
                </td>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelected(o)}
                      title="View Order"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                    >
                      <ViewIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(o)}
                      title="Edit Order"
                      disabled={o.status === "completed" || o.status === "cancelled"}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10"
                    >
                      <Edit02Icon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintKot(o)}
                      title="Print KOT"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                    >
                      <PrinterIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRefund(o)}
                      title="Refund"
                      disabled={o.paymentStatus !== "paid"}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10"
                    >
                      <CashbackIcon size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(o)}
                      title="Cancel"
                      disabled={o.status === "completed" || o.status === "cancelled"}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-30"
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

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

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
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
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

      {editing && editForm && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit {editing.orderNumber}</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">Table</span>
                <input
                  value={editForm.table}
                  onChange={(e) => setEditForm((f) => ({ ...f, table: e.target.value }))}
                  placeholder="e.g. T3"
                  className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">Waiter</span>
                <input
                  value={editForm.waiter}
                  onChange={(e) => setEditForm((f) => ({ ...f, waiter: e.target.value }))}
                  className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">Customer</span>
                <input
                  value={editForm.customer}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer: e.target.value }))}
                  className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-(--color-text-muted)">Items</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {editForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border border-(--color-border) px-2.5 py-1.5 text-sm">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateEditQty(idx, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-(--color-border)"
                      >
                        <MinusSignIcon size={12} strokeWidth={1.8} />
                      </button>
                      <span className="w-4 text-center tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateEditQty(idx, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-(--color-border)"
                      >
                        <Add01Icon size={12} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEditItem(idx)}
                        className="flex h-6 w-6 items-center justify-center rounded text-(--color-text-muted) hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Delete02Icon size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}
                {editForm.items.length === 0 && (
                  <div className="text-xs text-(--color-text-muted)">No items left in this order.</div>
                )}
              </div>
            </div>

            <label className="mt-4 flex flex-col gap-1">
              <span className="text-xs text-(--color-text-muted)">Amount (₹)</span>
              <input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveEdit}
              className="mt-5 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
