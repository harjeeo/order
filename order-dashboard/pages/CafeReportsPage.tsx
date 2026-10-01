import { useEffect, useState } from "react";
import {
  ChartLineData02Icon,
  Invoice01Icon,
  Coins01Icon,
  PackageIcon,
  Wallet01Icon,
  StarIcon,
  Medal01Icon,
  Download04Icon,
  Store01Icon,
  ShoppingBag01Icon,
  TruckDeliveryIcon,
  GlobalIcon,
  Search01Icon,
  Clock01Icon,
  AddCircleIcon,
} from "hugeicons-react";
import { getReportsSummary, exportGstReportCsv, getOutlets, REPORT_RANGES } from "../lib/api";

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CafeReportsPage() {
  const [range, setRange] = useState("daily");
  const [report, setReport] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [multiOutlet, setMultiOutlet] = useState(false);
  const [allOutlets, setAllOutlets] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    getOutlets().then((list) => setMultiOutlet(list.length > 1));
  }, []);

  useEffect(() => {
    getReportsSummary({ range, allOutlets }).then(setReport);
  }, [range, allOutlets]);

  async function handleExportGst() {
    setExporting(true);
    try {
      const blob = await exportGstReportCsv({ allOutlets });
      downloadBlob(blob, `gst-sales-register-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  if (!report) return null;

  const maxTrend = Math.max(...report.sales.trend.map((t) => t.amount), 1);
  const maxCategory = Math.max(...(Object.values(report.products.categorySales) as number[]), 1);
  const maxPayment = Math.max(...(Object.values(report.payments) as number[]), 1);
  const maxExpenseCategory = Math.max(...report.expenses.byCategory.map((e) => e.amount), 1);
  const maxHourly = Math.max(...report.hourly.map((h) => h.amount), 1);

  const filteredItems = report.products.allItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.trim().toLowerCase())
  );

  const CHANNELS = [
    { key: "dineIn", label: "Dine In", icon: Store01Icon },
    { key: "takeaway", label: "Takeaway", icon: ShoppingBag01Icon },
    { key: "delivery", label: "Delivery", icon: TruckDeliveryIcon },
    { key: "online", label: "Online", icon: GlobalIcon },
  ];

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ChartLineData02Icon size={20} strokeWidth={1.8} />
            Reports
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Sales, orders, products, payments, inventory and expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          {multiOutlet && (
            <div className="flex gap-1 rounded-md border border-(--color-border) p-0.5">
              {[
                { key: false, label: "This Outlet" },
                { key: true, label: "All Outlets" },
              ].map((o) => (
                <button
                  key={String(o.key)}
                  type="button"
                  onClick={() => setAllOutlets(o.key)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    allOutlets === o.key ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
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
      </div>

      <button
        type="button"
        onClick={handleExportGst}
        disabled={exporting}
        className="mt-4 flex w-fit items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm disabled:opacity-50"
      >
        <Download04Icon size={14} strokeWidth={1.8} />
        {exporting ? "Exporting…" : "Export GST Sales Register (CSV)"}
      </button>

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

      {/* Sales by Channel */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <GlobalIcon size={14} strokeWidth={1.8} />
          Sales by Channel
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHANNELS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-xl border border-(--color-border) p-4">
              <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                <Icon size={13} strokeWidth={1.8} />
                {label}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(report.channels[key].amount)}</div>
              <div className="mt-0.5 text-xs text-(--color-text-muted)">
                {report.channels[key].orders} order{report.channels[key].orders === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hourly Sales */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <Clock01Icon size={14} strokeWidth={1.8} />
          Sales by Hour
        </h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-(--color-border) p-4">
          <div className="flex min-w-[720px] items-end gap-1">
            {report.hourly.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${h.hour}:00 — ${formatCurrency(h.amount)} (${h.orders} orders)`}
                  className="w-full rounded-t bg-(--color-accent)/60"
                  style={{ height: `${(h.amount / maxHourly) * 80 + 2}px` }}
                />
                <span className="text-[9px] text-(--color-text-muted)">{h.hour}</span>
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

        {/* Feedback */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <StarIcon size={14} strokeWidth={1.8} />
            Customer Feedback
          </h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold tabular-nums">{report.feedback.averageRating || "-"}</div>
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} size={14} strokeWidth={1.8} className={n <= Math.round(report.feedback.averageRating) ? "fill-amber-400" : "fill-transparent"} />
                ))}
              </div>
              <span className="text-xs text-(--color-text-muted)">({report.feedback.count} ratings)</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {report.feedback.recent.map((f, i) => (
                <div key={i} className="rounded-md border border-(--color-border) p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.invoiceNumber}</span>
                    <span className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <StarIcon key={n} size={11} strokeWidth={1.8} className={n <= f.rating ? "fill-amber-400" : "fill-transparent"} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-(--color-text-muted)">{f.note}</p>
                </div>
              ))}
              {report.feedback.count === 0 && <p className="text-xs text-(--color-text-muted)">No feedback collected yet.</p>}
            </div>
          </div>
        </section>

        {/* Waiter leaderboard */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Medal01Icon size={14} strokeWidth={1.8} />
            Waiter Leaderboard
          </h2>
          <div className="mt-2 rounded-xl border border-(--color-border) p-4">
            <div className="flex flex-col gap-2">
              {report.waiterLeaderboard.map((w, i) => (
                <div key={w.waiter} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-xs text-(--color-text-muted)">#{i + 1}</span>
                    {w.waiter}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-(--color-text-muted)">{w.orders} orders</span>
                    <span className="tabular-nums font-medium">{formatCurrency(w.sales)}</span>
                  </span>
                </div>
              ))}
              {report.waiterLeaderboard.length === 0 && (
                <p className="text-xs text-(--color-text-muted)">No waiter-attributed sales yet.</p>
              )}
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

      {/* Item Sales Report */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
            <Invoice01Icon size={14} strokeWidth={1.8} />
            Item Sales Report
          </h2>
          <div className="relative w-56">
            <Search01Icon
              size={14}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search item…"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-xs outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>
        <div className="mt-2 max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--color-canvas)">
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty Sold</th>
                <th className="px-3 py-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.name} className="border-b border-(--color-border) last:border-0">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">{item.qty}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tax Report: Item Wise */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <Coins01Icon size={14} strokeWidth={1.8} />
          Tax Report: Item Wise
        </h2>
        <div className="mt-2 max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--color-canvas)">
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Taxable Value</th>
                <th className="px-3 py-2 font-medium">Tax %</th>
                <th className="px-3 py-2 font-medium">Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.products.taxByItem.map((item) => (
                <tr key={item.name} className="border-b border-(--color-border) last:border-0">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">{item.qty}</td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">{formatCurrency(item.taxableValue)}</td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">{item.taxPercent}%</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(item.taxAmount)}</td>
                </tr>
              ))}
              {report.products.taxByItem.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No taxable sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Item Sales Report with Bill No. */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <Invoice01Icon size={14} strokeWidth={1.8} />
          Item Sales Report With Bill No.
        </h2>
        <p className="mt-1 text-xs text-(--color-text-muted)">Most recent 200 line items in this period.</p>
        <div className="mt-2 max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--color-canvas)">
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Bill No.</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.products.itemSalesByBill.map((row, i) => (
                <tr key={i} className="border-b border-(--color-border) last:border-0">
                  <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">
                    {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2">{row.itemName}</td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">{row.qty}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
              {report.products.itemSalesByBill.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No billed items in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Addon Popularity */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <AddCircleIcon size={14} strokeWidth={1.8} />
          Addon Popularity
        </h2>
        <p className="mt-1 text-xs text-(--color-text-muted)">
          How often each add-on was chosen. Add-on cost is folded into the item price, so this tracks popularity, not
          separate revenue.
        </p>
        <div className="mt-2 rounded-xl border border-(--color-border) p-4">
          {report.products.addonPopularity.map((a) => (
            <div key={a.name} className="flex items-center justify-between py-1 text-sm">
              <span className="text-(--color-text-muted)">{a.name}</span>
              <span className="tabular-nums font-medium">{a.timesOrdered}×</span>
            </div>
          ))}
          {report.products.addonPopularity.length === 0 && (
            <p className="text-xs text-(--color-text-muted)">No add-ons ordered in this period.</p>
          )}
        </div>
      </section>
    </div>
  );
}
