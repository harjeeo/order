import { useEffect, useState } from "react";
import { Building06Icon, CheckmarkCircle02Icon, PauseIcon, MoneyBag02Icon, Home01Icon } from "hugeicons-react";
import { getSuperAdminStats } from "../lib/api";

const CARDS = [
  { key: "totalTenants", label: "Total Cafes / Restaurants", icon: Building06Icon },
  { key: "activeTenants", label: "Active", icon: CheckmarkCircle02Icon },
  { key: "suspendedTenants", label: "Suspended", icon: PauseIcon },
  { key: "platformRevenue", label: "Platform-wide Revenue", icon: MoneyBag02Icon, format: "currency" },
];

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getSuperAdminStats().then(setStats);
  }, []);

  return (
    <div className="px-10 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Home01Icon size={20} strokeWidth={1.8} />
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Overview across every cafe/restaurant on the platform.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      {stats && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-(--color-text-muted)">New Signups (last 5 days)</h2>
          <div className="mt-3 flex items-end gap-1.5">
            {stats.recentSignups.map((d) => {
              const max = Math.max(...stats.recentSignups.map((s) => s.count), 1);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    title={`${d.date}: ${d.count}`}
                    className="w-full rounded-t bg-(--color-accent)/60"
                    style={{ height: `${(d.count / max) * 80 + 4}px` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
