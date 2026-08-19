import { useEffect, useState } from "react";
import {
  MoneyBag02Icon,
  Invoice01Icon,
  TimeQuarterPassIcon,
  CheckmarkCircle02Icon,
  ChartLineData02Icon,
  Store01Icon,
  ShoppingBag01Icon,
  TruckDeliveryIcon,
  Alert02Icon,
} from "hugeicons-react";
import { getCafeDashboardStats } from "../lib/mockApi";

const CARDS = [
  { key: "todaySales", label: "Today's Sales", icon: MoneyBag02Icon, format: "currency" },
  { key: "todayOrders", label: "Today's Orders", icon: Invoice01Icon },
  { key: "pendingOrders", label: "Pending Orders", icon: TimeQuarterPassIcon },
  { key: "completedOrders", label: "Completed Orders", icon: CheckmarkCircle02Icon },
  { key: "totalRevenue", label: "Total Revenue", icon: ChartLineData02Icon, format: "currency" },
];

const ORDER_TYPES = [
  { key: "dineIn", label: "Dine-in", icon: Store01Icon },
  { key: "takeaway", label: "Takeaway", icon: ShoppingBag01Icon },
  { key: "delivery", label: "Delivery", icon: TruckDeliveryIcon },
];

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function CafeDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getCafeDashboardStats().then(setStats);
  }, []);

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Today's overview across all order types.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map(({ key, label, icon: Icon, format }) => (
          <div key={key} className="rounded-xl border border-(--color-border) p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {stats ? (format === "currency" ? formatCurrency(stats[key]) : stats[key]) : "—"}
            </div>
            <div className="text-xs text-(--color-text-muted)">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-(--color-text-muted)">Sales (last 6 hours)</h2>
          {stats && (
            <div className="mt-3 flex items-end gap-2 rounded-xl border border-(--color-border) p-4">
              {stats.salesByHour.map((h) => {
                const max = Math.max(...stats.salesByHour.map((s) => s.amount), 1);
                return (
                  <div key={h.time} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      title={`${h.time}: ${formatCurrency(h.amount)}`}
                      className="w-full rounded-t bg-(--color-accent)/60"
                      style={{ height: `${(h.amount / max) * 100 + 4}px` }}
                    />
                    <span className="text-[10px] text-(--color-text-muted)">{h.time}</span>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="mt-6 text-sm font-medium text-(--color-text-muted)">Order Type Summary</h2>
          {stats && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {ORDER_TYPES.map(({ key, label, icon: Icon }) => (
                <div key={key} className="rounded-xl border border-(--color-border) p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                  <div className="mt-2 text-xl font-semibold tabular-nums">
                    {stats.orderTypeSummary[key]}
                  </div>
                  <div className="text-xs text-(--color-text-muted)">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-medium text-(--color-text-muted)">Best Selling Items</h2>
            <div className="mt-3 divide-y divide-(--color-border) rounded-xl border border-(--color-border)">
              {stats?.bestSellingItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-(--color-text-muted)">{item.qty} sold</div>
                  </div>
                  <div className="tabular-nums text-(--color-text-muted)">{formatCurrency(item.revenue)}</div>
                </div>
              )) ?? <div className="px-4 py-3 text-sm text-(--color-text-muted)">Loading…</div>}
            </div>
          </div>

          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
              <Alert02Icon size={14} strokeWidth={1.8} />
              Low Stock Alert
            </h2>
            <div className="mt-3 divide-y divide-(--color-border) rounded-xl border border-(--color-border)">
              {stats && stats.lowStockItems.length === 0 && (
                <div className="px-4 py-3 text-sm text-(--color-text-muted)">All stock levels healthy.</div>
              )}
              {stats?.lowStockItems.map((item) => (
                <div key={item.ingredient} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="font-medium">{item.ingredient}</div>
                  <div className="text-xs text-red-500">
                    {item.stock} <span className="text-(--color-text-muted)">/ min {item.minimum}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
