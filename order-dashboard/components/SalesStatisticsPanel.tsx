import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { getSalesStats } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "./ui/chart";

const chartConfig = {
  dineIn: { label: "Dine In", color: "var(--chart-1)" },
  pickUp: { label: "Pick Up", color: "var(--chart-2)" },
  delivery: { label: "Delivery", color: "var(--chart-3)" },
} satisfies ChartConfig;

const PAYMENT_DOT: Record<string, string> = {
  cash: "bg-blue-500",
  card: "bg-emerald-500",
  other: "bg-amber-500",
};
const PAYMENT_BAR: Record<string, string> = {
  cash: "bg-blue-500",
  card: "bg-emerald-500",
  other: "bg-amber-500",
};

function toDateKey(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function formatPickerLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function SalesStatisticsPanel() {
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [stats, setStats] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getSalesStats(date).then(setStats);
  }, [date]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--color-text-muted)">Sales Statistics</h2>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon />
              {formatPickerLabel(date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={new Date(`${date}T00:00:00`)}
              onSelect={(d) => {
                if (!d) return;
                setDate(toDateKey(d));
                setOpen(false);
              }}
              disabled={{ after: new Date() }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-(--color-border) p-4">
          <div className="text-xs text-(--color-text-muted)">Total Sales</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {stats ? formatCurrency(stats.totalSales) : "—"}
          </div>
          <div className="text-xs text-(--color-text-muted)">
            {stats ? `${stats.successfulOrders} orders` : "Loading…"}
          </div>

          {stats && stats.totalSales > 0 && (
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-(--color-border)">
              {stats.paymentBreakdown
                .filter((p: any) => p.amount > 0)
                .map((p: any) => (
                  <div key={p.key} className={PAYMENT_BAR[p.key]} style={{ width: `${p.percent}%` }} />
                ))}
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            {stats?.paymentBreakdown.map((p: any) => (
              <div key={p.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-(--color-text-muted)">
                  <span className={`h-2 w-2 rounded-full ${PAYMENT_DOT[p.key]}`} />
                  {p.label}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(p.amount)} <span className="text-(--color-text-muted)">{p.percent}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-(--color-border) p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-(--color-text-muted)">Daily · stacked by channel</div>
            <div className="text-xs text-(--color-text-muted)">
              Total orders <span className="font-semibold text-(--color-text)">{stats?.totalOrders ?? "—"}</span>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-[220px] w-full">
            <BarChart accessibilityLayer data={stats?.channelBuckets ?? []}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={10}
                tickFormatter={(v: string) => v.split(" - ")[0]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="dineIn" stackId="a" fill="var(--color-dineIn)" />
              <Bar dataKey="pickUp" stackId="a" fill="var(--color-pickUp)" />
              <Bar dataKey="delivery" stackId="a" fill="var(--color-delivery)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
