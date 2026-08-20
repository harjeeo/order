import { useEffect, useState } from "react";
import {
  ChartLineData02Icon,
  Invoice01Icon,
  Coins01Icon,
  PackageIcon,
  Wallet01Icon,
} from "hugeicons-react";
import { getReportsSummary, REPORT_RANGES } from "../lib/api";

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CafeReportsPage() {
  const [range, setRange] = useState("daily");
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    getReportsSummary({ range }).then(setReport);
  }, [range]);

  if (!report) return null;

  const maxTrend = Math.max(...report.sales.trend.map((t) => t.amount), 1);
  const maxCategory = Math.max(...(Object.values(report.products.categorySales) as number[]), 1);
  const maxPayment = Math.max(...(Object.values(report.payments) as number[]), 1);
  const maxExpenseCategory = Math.max(...report.expenses.byCategory.map((e) => e.amount), 1);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Sales, orders, products, payments, inventory and expenses.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-(--color-border) p-0.5">
          {REPORT_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                range === r ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Sales */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <ChartLineData02Icon size={14} strokeWidth={1.8} />
          Sales
        </h2>
        <div className="mt-2 rounded-xl border border-(--color-border) p-4">
          <div className="text-2xl font-semibold tabular-nums">{formatCurrency(report.sales.total)}</div>
          <div className="mt-3 flex items-end gap-2">
            {report.sales.trend.map((t) => (
              <div key={t.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${t.label}: ${formatCurrency(t.amount)}`}
                  className="w-full rounded-t bg-(--color-accent)/60"
                  style={{ height: `${(t.amount / maxTrend) * 90 + 4}px` }}
                />
                <span className="text-[10px] text-(--color-text-muted)">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Orders */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Invoice01Icon size={14} strokeWidth={1.8} />
            Orders
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums">{report.orders.total}</div>
              <div className="text-xs text-(--color-text-muted)">Total Orders</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{report.orders.completed}</div>
              <div className="text-xs text-(--color-text-muted)">Completed</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums text-red-500">{report.orders.cancelled}</div>
              <div className="text-xs text-(--color-text-muted)">Cancelled</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums">{formatCurrency(report.orders.avgOrderValue)}</div>
              <div className="text-xs text-(--color-text-muted)">Avg Order Value</div>
            </div>
          </div>
        </section>

        {/* Payments */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Coins01Icon size={14} strokeWidth={1.8} />
            Payments
          </h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            {Object.entries(report.payments).map(([method, amount]: [string, number]) => (
              <div key={method} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs">
                  <span className="uppercase text-(--color-text-muted)">{method}</span>
                  <span className="tabular-nums">{formatCurrency(amount)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-(--color-accent)"
                    style={{ width: `${(amount / maxPayment) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="text-sm font-medium text-(--color-text-muted)">Best Sellers</h2>
          <div className="mt-2 divide-y divide-(--color-border) rounded-xl border border-(--color-border)">
            {report.products.bestSellers.map((item) => (
              <div key={item.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-(--color-text-muted)">{item.qty} sold</div>
                </div>
                <div className="tabular-nums text-(--color-text-muted)">{formatCurrency(item.revenue)}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-(--color-text-muted)">Category Sales</h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            {Object.entries(report.products.categorySales).map(([category, amount]: [string, number]) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs">
                  <span className="text-(--color-text-muted)">{category}</span>
                  <span className="tabular-nums">{formatCurrency(amount)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-(--color-accent)"
                    style={{ width: `${(amount / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inventory */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <PackageIcon size={14} strokeWidth={1.8} />
            Inventory
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums">{report.inventory.totalIngredients}</div>
              <div className="text-xs text-(--color-text-muted)">Ingredients</div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{report.inventory.lowStock}</div>
              <div className="text-xs text-(--color-text-muted)">Low Stock</div>
            </div>
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3">
              <div className="text-xl font-semibold tabular-nums text-red-500">{report.inventory.outOfStock}</div>
              <div className="text-xs text-(--color-text-muted)">Out of Stock</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-xl font-semibold tabular-nums">{report.inventory.wastageTotal}</div>
              <div className="text-xs text-(--color-text-muted)">Wastage (units)</div>
            </div>
          </div>
        </section>

        {/* Expenses */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Wallet01Icon size={14} strokeWidth={1.8} />
            Expenses
          </h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            <div className="mb-3 text-lg font-semibold tabular-nums">{formatCurrency(report.expenses.total)}</div>
            {report.expenses.byCategory
              .filter((e) => e.amount > 0)
              .map((e) => (
                <div key={e.category} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-(--color-text-muted)">{e.category}</span>
                    <span className="tabular-nums">{formatCurrency(e.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-(--color-accent)"
                      style={{ width: `${(e.amount / maxExpenseCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
