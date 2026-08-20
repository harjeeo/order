import { useEffect, useState } from "react";
import { ChartLineData02Icon, Building06Icon, Alert02Icon } from "hugeicons-react";
import { getSuperAdminReports } from "../lib/mockApi";

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SuperAdminReportsPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    getSuperAdminReports().then(setReport);
  }, []);

  if (!report) return null;

  const maxPlanRevenue = Math.max(...report.revenueByPlan.map((p) => p.revenue), 1);

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Platform Reports</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Revenue, status and health across every client.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-(--color-border) p-4">
          <div className="text-2xl font-semibold tabular-nums">{report.statusCounts.active}</div>
          <div className="text-xs text-(--color-text-muted)">Active Clients</div>
        </div>
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
          <div className="text-2xl font-semibold tabular-nums text-red-500">{report.statusCounts.suspended}</div>
          <div className="text-xs text-(--color-text-muted)">Suspended</div>
        </div>
        <div className="rounded-xl border border-(--color-border) p-4">
          <div className="text-2xl font-semibold tabular-nums">{report.totalOrders}</div>
          <div className="text-xs text-(--color-text-muted)">Total Orders (all clients)</div>
        </div>
        <div className="rounded-xl border border-(--color-border) p-4">
          <div className="text-2xl font-semibold tabular-nums">{formatCurrency(report.avgRevenuePerTenant)}</div>
          <div className="text-xs text-(--color-text-muted)">Avg Revenue / Client</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <ChartLineData02Icon size={14} strokeWidth={1.8} />
            Revenue by Plan
          </h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            {report.revenueByPlan.map((p) => (
              <div key={p.plan} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs">
                  <span className="text-(--color-text-muted)">
                    {p.plan} <span className="text-(--color-text)">({p.count})</span>
                  </span>
                  <span className="tabular-nums">{formatCurrency(p.revenue)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-(--color-accent)"
                    style={{ width: `${(p.revenue / maxPlanRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Building06Icon size={14} strokeWidth={1.8} />
            Top Clients by Revenue
          </h2>
          <div className="mt-2 divide-y divide-(--color-border) rounded-xl border border-(--color-border)">
            {report.topTenants.map((t) => (
              <div key={t._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-(--color-text-muted)">{t.plan} plan</div>
                </div>
                <div className="tabular-nums text-(--color-text-muted)">{formatCurrency(t.totalRevenue)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Alert02Icon size={14} strokeWidth={1.8} />
            Plans Expiring Soon (30 days)
          </h2>
          <div className="mt-2 divide-y divide-(--color-border) rounded-xl border border-(--color-border)">
            {report.expiringPlans.length === 0 && (
              <div className="px-4 py-3 text-sm text-(--color-text-muted)">No plans expiring soon.</div>
            )}
            {report.expiringPlans.map((t) => (
              <div key={t._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-(--color-text-muted)">{t.plan} plan</div>
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">{formatDate(t.planExpiry)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
