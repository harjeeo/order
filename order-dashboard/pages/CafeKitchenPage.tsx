import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RestaurantTableIcon,
  Clock01Icon,
  ArrowRight01Icon,
  PrinterIcon,
  FireIcon,
  StickyNote01Icon,
  ComputerVideoIcon,
  KitchenUtensilsIcon,
  GridViewIcon,
  ListViewIcon,
} from "hugeicons-react";
import { getKitchenOrders, updateKitchenOrderStatus, toggleKitchenOrderPriority, reprintKot } from "../lib/api";
import { buildKotHtml, printHtml } from "../lib/print";
import { onOutletEvent } from "../lib/socket";

const COLUMNS = [
  { key: "new", label: "New", next: "preparing" },
  { key: "preparing", label: "Preparing", next: "ready" },
  { key: "ready", label: "Ready", next: "completed" },
  { key: "completed", label: "Completed", next: null },
];

function minutesAgo(iso) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function formatDuration(fromIso, toIso) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 0) return "--";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr : ${mins % 60} min`;
}

const STATUS_LABELS = { new: "New", preparing: "Preparing", ready: "Ready", completed: "Completed" };

export default function CafeKitchenPage() {
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("board");
  // Unread on purpose — ticking this every 30s just forces a re-render so
  // each ticket's elapsed-time badge re-evaluates Date.now() on its own.
  const [_now, setNow] = useState(Date.now());

  async function refresh() {
    setOrders(await getKitchenOrders());
  }

  useEffect(() => {
    refresh();
    // Real-time updates (socket) are the primary path now; this is just a
    // slow fallback poll in case a connection drops silently.
    const poll = setInterval(refresh, 30000);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const unsubscribe = onOutletEvent("kitchen:changed", refresh);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      unsubscribe();
    };
  }, []);

  async function advance(order) {
    const col = COLUMNS.find((c) => c.key === order.status);
    if (!col?.next) return;
    await updateKitchenOrderStatus(order._id, col.next);
    refresh();
  }

  async function togglePriority(order) {
    await toggleKitchenOrderPriority(order._id);
    refresh();
  }

  async function handleReprint(order) {
    await reprintKot(order._id);
    printHtml(
      buildKotHtml({
        title: "REPRINT - KITCHEN ORDER TICKET",
        orderNumber: order.orderNumber,
        table: order.tableNumber,
        orderType: order.orderType,
        items: order.items,
        notes: order.notes,
      })
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <KitchenUtensilsIcon size={20} strokeWidth={1.8} />
            Kitchen
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Live order queue — New → Preparing → Ready → Completed.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-(--color-border) p-0.5">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "board" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted) hover:text-(--color-text)"
              }`}
            >
              <GridViewIcon size={13} strokeWidth={1.8} />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "list" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted) hover:text-(--color-text)"
              }`}
            >
              <ListViewIcon size={13} strokeWidth={1.8} />
              List
            </button>
          </div>
          <Link
            to="/cafe/kitchen/display"
            target="_blank"
            className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm"
          >
            <ComputerVideoIcon size={15} strokeWidth={1.8} />
            Open Kitchen Display
          </Link>
        </div>
      </div>

      {view === "list" ? (
        <KitchenListView orders={orders} />
      ) : (
      <div className="mt-6 grid flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o) => o.status === col.key)
            .sort((a, b) => (b.priority === a.priority ? 0 : b.priority ? 1 : -1));
          return (
            <div key={col.key} className="flex flex-col overflow-hidden rounded-xl border border-(--color-border)">
              <div className="flex items-center justify-between border-b border-(--color-border) px-3 py-2">
                <span className="text-sm font-medium">{col.label}</span>
                <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-(--color-text-muted) dark:bg-white/10">
                  {colOrders.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {colOrders.map((order) => {
                  const age = minutesAgo(order.createdAt);
                  return (
                    <div
                      key={order._id}
                      className={`rounded-lg border p-3 text-sm ${
                        order.priority ? "border-amber-500/50 bg-amber-500/5" : "border-(--color-border)"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{order.orderNumber}</span>
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            age > 10 ? "text-red-500" : "text-(--color-text-muted)"
                          }`}
                        >
                          <Clock01Icon size={12} strokeWidth={1.8} />
                          {age}m
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                        {order.tableNumber ? (
                          <>
                            <RestaurantTableIcon size={12} strokeWidth={1.8} />
                            {order.tableNumber}
                          </>
                        ) : (
                          <span className="capitalize">{order.orderType}</span>
                        )}
                      </div>

                      <ul className="mt-2 space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-medium">{item.qty}×</span> {item.name}
                            {item.notes && (
                              <div className="flex items-center gap-1 pl-4 text-(--color-text-muted)">
                                <StickyNote01Icon size={10} strokeWidth={1.8} />
                                {item.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex items-center gap-1.5">
                        {col.next && (
                          <button
                            type="button"
                            onClick={() => advance(order)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-(--color-accent) py-1.5 text-xs font-medium text-white"
                          >
                            {COLUMNS.find((c) => c.key === col.next).label}
                            <ArrowRight01Icon size={12} strokeWidth={1.8} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePriority(order)}
                          title="Priority order"
                          className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                            order.priority
                              ? "border-amber-500 text-amber-500 hover:bg-amber-500/10"
                              : "border-(--color-border) text-(--color-text-muted) hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                          }`}
                        >
                          <FireIcon size={13} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReprint(order)}
                          title="Reprint KOT"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                        >
                          <PrinterIcon size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="py-6 text-center text-xs text-(--color-text-muted)">No orders.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function KitchenListView({ orders }) {
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="mt-6 flex-1 overflow-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-(--color-surface) text-xs text-(--color-text-muted)">
          <tr className="border-b border-(--color-border)">
            <th className="px-3 py-2 font-medium">Order #</th>
            <th className="px-3 py-2 font-medium">Order Type</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">No. Of Items</th>
            <th className="px-3 py-2 font-medium">Items</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((order) => (
            <tr key={order._id} className="border-b border-(--color-border) last:border-0">
              <td className="px-3 py-2 font-medium">
                {order.orderNumber}
                {order.priority && <FireIcon size={12} strokeWidth={1.8} className="ml-1 inline text-amber-500" />}
              </td>
              <td className="px-3 py-2 capitalize">
                {order.tableNumber ? `Dine In (${order.tableNumber})` : order.orderType}
              </td>
              <td className="px-3 py-2 text-(--color-text-muted)">{order.customerName || "--"}</td>
              <td className="px-3 py-2">{order.items.length}</td>
              <td className="px-3 py-2 text-(--color-text-muted)">
                {order.items.map((i) => `${i.name} (${i.qty})`).join(", ")}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    order.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : order.status === "ready"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-black/5 text-(--color-text-muted) dark:bg-white/10"
                  }`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </td>
              <td className="px-3 py-2 text-(--color-text-muted)">{new Date(order.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-(--color-text-muted)">
                {order.readyAt ? formatDuration(order.createdAt, order.readyAt) : "--"}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-xs text-(--color-text-muted)">
                No orders.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
