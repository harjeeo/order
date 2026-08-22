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

export default function CafeKitchenPage() {
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(Date.now());

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
          <h1 className="text-2xl font-semibold">Kitchen</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Live order queue — New → Preparing → Ready → Completed.</p>
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
    </div>
  );
}
