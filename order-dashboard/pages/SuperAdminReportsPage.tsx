import { useEffect, useState } from "react";
import { ChartLineData02Icon, Building06Icon, Alert02Icon, AnalyticsUpIcon, Download04Icon } from "hugeicons-react";
import { getSuperAdminReports, exportSuperAdminReportCsv } from "../lib/api";

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 140;
const CHART_PAD = 8;

function GrowthTrendChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const stepX = data.length > 1 ? (CHART_WIDTH - CHART_PAD * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = CHART_PAD + i * stepX;
    const y = CHART_HEIGHT - CHART_PAD - (d.revenue / max) * (CHART_HEIGHT - CHART_PAD * 2);
    return { x, y, d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${CHART_HEIGHT} L ${points[0]?.x ?? 0} ${CHART_HEIGHT} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <path d={areaPath} fill="var(--color-accent)" opacity="0.08" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-accent)">
            <title>
              {p.d.label}: {formatCurrency(p.d.revenue)} · {p.d.orderCount} orders · {p.d.newTenants} new signups
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-(--color-text-muted)">
        {data.map((d) => (
          <span key={d.month}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminReportsPage() {
  const [report, setReport] = useState(null);
  const [expiringDays, setExpiringDays] = useState(30);
  const [months, setMonths] = useState(6);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getSuperAdminReports({ expiringDays, months }).then(setReport);
  }, [expiringDays, months]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportSuperAdminReportCsv({ expiringDays, months });
      downloadBlob(blob, `platform-report-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  if (!report) return null;

  const maxPlanRevenue = Math.max(...report.revenueByPlan.map((p) => p.revenue), 1);

  return (
    <div className="px-10 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ChartLineData02Icon size={20} strokeWidth={1.8} />
            Platform Reports
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Revenue, status and health across every client.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          <Download04Icon size={14} strokeWidth={1.8} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-(--color-border) px-3 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs text-(--color-text-muted)">Growth trend</span>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs text-(--color-text-muted)">Expiring plans window</span>
          <select
            value={expiringDays}
            onChange={(e) => setExpiringDays(Number(e.target.value))}
            className="rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
          >
            <option value={7}>Next 7 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
            <option value={90}>Next 90 days</option>
          </select>
        </label>
      </div>

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

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <AnalyticsUpIcon size={14} strokeWidth={1.8} />
          Revenue Growth ({months} months)
        </h2>
        <div className="mt-2 rounded-xl border border-(--color-border) p-4">
          <GrowthTrendChart data={report.growthTrend} />
        </div>
      </section>

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
            Plans Expiring Soon ({expiringDays} days)
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
