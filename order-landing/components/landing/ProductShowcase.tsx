import { useState } from "react";
import { ShoppingCart01Icon, ChartLineData02Icon, UserGroupIcon } from "hugeicons-react";

const TABS = [
  { key: "orders", label: "Order Management", icon: ShoppingCart01Icon },
  { key: "reports", label: "Reports & Analytics", icon: ChartLineData02Icon },
  { key: "staff", label: "Staff Management", icon: UserGroupIcon },
];

export default function ProductShowcase() {
  const [tab, setTab] = useState("orders");

  return (
    <section id="showcase" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 xl:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Product Tour</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Simple Tools. Powerful Results
        </h2>
        <p className="mt-3 text-(--color-text-muted)">
          Every screen your floor and kitchen touch every shift, built into one clean dashboard.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-(--color-border) text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-10 max-w-4xl rounded-2xl border border-(--color-border) bg-(--color-sidebar) p-2 shadow-2xl shadow-black/5">
        <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-canvas)">
          <div className="flex items-center gap-1.5 border-b border-(--color-border) px-4 py-3 sm:px-6">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-(--color-text-muted)">orderdashboard.app/cafe</span>
          </div>

          <img
            src="/dashboard-screenshot.png"
            alt="Cafe Dashboard screen showing today's sales, orders, sales trend and order type summary"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
