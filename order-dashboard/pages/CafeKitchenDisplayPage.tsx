import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RestaurantTableIcon, Clock01Icon, FireIcon, ArrowLeft01Icon } from "hugeicons-react";
import { getKitchenOrders, updateKitchenOrderStatus } from "../lib/api";
import { onOutletEvent } from "../lib/socket";

const COLUMNS = [
  { key: "new", label: "New", next: "preparing" },
  { key: "preparing", label: "Preparing", next: "ready" },
  { key: "ready", label: "Ready", next: "completed" },
];

function minutesAgo(iso) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// A short, synthesized beep (no external audio file to ship/host) played
// when a new order lands — the whole point of this screen is that nobody
// is staring at it every second.
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Audio isn't available (e.g. autoplay policy before any user
    // interaction) — the visual update alone still gets the job done.
  }
}

export default function CafeKitchenDisplayPage() {
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(Date.now());
  const prevNewIds = useRef(new Set<string>());

  async function refresh() {
    const data = await getKitchenOrders();
    setOrders(data);
    const currentNewIds = new Set<string>(data.filter((o: any) => o.status === "new").map((o: any) => o._id));
    const hasNewArrival = [...currentNewIds].some((id) => !prevNewIds.current.has(id));
    if (hasNewArrival && prevNewIds.current.size > 0) playBeep();
    prevNewIds.current = currentNewIds;
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 30000);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    const unsubscribe = onOutletEvent("kitchen:changed", refresh);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      unsubscribe();
    };
  }, []);

  async function advance(order, next) {
    await updateKitchenOrderStatus(order._id, next);
    refresh();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-(--color-canvas) text-(--color-text)">
      <header className="flex items-center justify-between border-b border-(--color-border) px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/cafe/kitchen" className="text-(--color-text-muted)">
            <ArrowLeft01Icon size={20} strokeWidth={1.8} />
          </Link>
          <h1 className="text-xl font-semibold">Kitchen Display</h1>
        </div>
        <span className="text-sm text-(--color-text-muted)">{new Date(now).toLocaleTimeString()}</span>
      </header>

      <div className="grid flex-1 grid-cols-3 gap-3 overflow-hidden p-3">
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o: any) => o.status === col.key)
            .sort((a: any, b: any) => (b.priority === a.priority ? 0 : b.priority ? 1 : -1));
          return (
            <div key={col.key} className="flex flex-col overflow-hidden rounded-2xl border border-(--color-border)">
              <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-sidebar) px-4 py-3">
                <span className="text-lg font-semibold">{col.label}</span>
                <span className="rounded-full bg-(--color-accent)/10 px-2.5 py-1 text-sm font-semibold text-(--color-accent)">
                  {colOrders.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {colOrders.map((order: any) => {
                  const age = minutesAgo(order.createdAt);
                  const late = age > 10;
                  return (
                    <button
                      key={order._id}
                      type="button"
                      onClick={() => advance(order, col.next)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                        late ? "border-red-500 bg-red-500/5" : order.priority ? "border-amber-500 bg-amber-500/5" : "border-(--color-border)"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{order.orderNumber}</span>
                        <span className={`flex items-center gap-1.5 text-lg font-semibold ${late ? "text-red-500" : "text-(--color-text-muted)"}`}>
                          <Clock01Icon size={18} strokeWidth={2} />
                          {age}m
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-sm text-(--color-text-muted)">
                        {order.priority && <FireIcon size={14} strokeWidth={2} className="text-amber-500" />}
                        {order.tableNumber ? (
                          <>
                            <RestaurantTableIcon size={14} strokeWidth={1.8} />
                            {order.tableNumber}
                          </>
                        ) : (
                          <span className="capitalize">{order.orderType}</span>
                        )}
                      </div>

                      <ul className="mt-3 space-y-1.5">
                        {order.items.map((item, i) => (
                          <li key={i} className="text-base">
                            <span className="font-bold">{item.qty}×</span> {item.name}
                            {item.notes && <div className="pl-5 text-sm text-(--color-text-muted)">{item.notes}</div>}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 text-center text-sm font-medium text-(--color-accent)">
                        Tap to mark {COLUMNS.find((c) => c.key === col.next)?.label ?? "Completed"}
                      </div>
                    </button>
                  );
                })}
                {colOrders.length === 0 && <div className="py-8 text-center text-(--color-text-muted)">No orders.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
