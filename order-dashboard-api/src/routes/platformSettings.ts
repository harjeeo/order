import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { sendEmail } from "../lib/email";
import { sendSms } from "../lib/sms";

export const platformSettingsRouter = Router();
platformSettingsRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

async function getOrCreate() {
  const existing = await prisma.platformSettings.findFirst();
  if (existing) return existing;
  return prisma.platformSettings.create({ data: {} });
}

platformSettingsRouter.get("/", async (_req, res) => {
  res.json(await getOrCreate());
});

platformSettingsRouter.patch("/", async (req, res) => {
  const current = await getOrCreate();
  const updated = await prisma.platformSettings.update({ where: { id: current.id }, data: req.body });
  res.json(updated);
});

const testEmailSchema = z.object({ to: z.string().email() });

// Sends a real email through whichever provider is currently configured,
// so a Super Admin can verify freshly-pasted API keys work before relying
// on automatic credential emails.
platformSettingsRouter.post("/email/test", async (req, res) => {
  const parsed = testEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const result = await sendEmail({
    to: parsed.data.to,
    subject: "Order Dashboard — test email",
    html: "<p>This is a test email from your Order Dashboard platform settings. If you're reading this, your email provider is configured correctly.</p>",
  });

  if (!result.ok) return res.status(422).json({ error: result.error ?? "Could not send test email", provider: result.provider });
  res.json({ ok: true, provider: result.provider });
});

const testSmsSchema = z.object({ to: z.string().min(5) });

// Same idea as /email/test — sends a real SMS through the configured
// provider so a Super Admin can verify credentials before it's relied on
// for automatic order-ready/bill-paid notifications. Not tenant-scoped
// (platform settings), so this uses a placeholder tenantId for the log row.
platformSettingsRouter.post("/sms/test", async (req, res) => {
  const parsed = testSmsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const result = await sendSms(
    "platform-settings-test",
    parsed.data.to,
    "This is a test SMS from your Order Dashboard platform settings. If you're reading this, your SMS provider is configured correctly."
  );

  if (!result.ok) return res.status(422).json({ error: result.error ?? "Could not send test SMS", provider: result.provider });
  res.json({ ok: true, provider: result.provider });
});

// Monthly buckets for the last `months` months (oldest first), each with
// new tenant signups, order count and revenue for that calendar month.
async function buildGrowthTrend(months: number) {
  const now = new Date();
  const buckets: { start: Date; end: Date; month: string; label: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      start,
      end,
      month: start.toISOString().slice(0, 7),
      label: start.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    });
  }

  return Promise.all(
    buckets.map(async ({ start, end, month, label }) => {
      const [newTenants, orders] = await Promise.all([
        prisma.tenant.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.order.findMany({
          where: { createdAt: { gte: start, lt: end }, status: { not: "cancelled" } },
          select: { amount: true },
        }),
      ]);
      return {
        month,
        label,
        newTenants,
        orderCount: orders.length,
        revenue: orders.reduce((s, o) => s + o.amount, 0),
      };
    })
  );
}

async function buildReport(expiringDays: number, growthMonths: number) {
  const tenants = await prisma.tenant.findMany();
  const revenueByOrders = await Promise.all(
    tenants.map(async (t) => {
      const orders = await prisma.order.findMany({ where: { tenantId: t.id, status: { not: "cancelled" } } });
      return { tenant: t, revenue: orders.reduce((s, o) => s + o.amount, 0), orderCount: orders.length };
    })
  );

  const revenueByPlan = ["Free", "Basic", "Pro"].map((plan) => {
    const rows = revenueByOrders.filter((r) => r.tenant.plan === plan);
    return { plan, revenue: rows.reduce((s, r) => s + r.revenue, 0), count: rows.length };
  });

  const topTenants = [...revenueByOrders].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const expiringPlans = tenants
    .filter((t) => t.planExpiry && (t.planExpiry.getTime() - Date.now()) / 86400000 <= expiringDays)
    .sort((a, b) => (a.planExpiry?.getTime() ?? 0) - (b.planExpiry?.getTime() ?? 0));

  const growthTrend = await buildGrowthTrend(growthMonths);

  return {
    revenueByPlan,
    statusCounts: {
      active: tenants.filter((t) => t.status === "active").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
    },
    topTenants: topTenants.map((r) => ({ ...r.tenant, totalRevenue: r.revenue })),
    expiringPlans,
    expiringDays,
    growthTrend,
    totalOrders: revenueByOrders.reduce((s, r) => s + r.orderCount, 0),
    avgRevenuePerTenant: tenants.length
      ? Math.round(revenueByOrders.reduce((s, r) => s + r.revenue, 0) / tenants.length)
      : 0,
  };
}

platformSettingsRouter.get("/reports", async (req, res) => {
  const expiringDays = Math.min(365, Math.max(1, Number(req.query.expiringDays) || 30));
  const growthMonths = Math.min(24, Math.max(1, Number(req.query.months) || 6));
  res.json(await buildReport(expiringDays, growthMonths));
});

// Downloads the same report as CSV — one section per table, matching the
// on-screen breakdown (revenue by plan, top clients, expiring plans,
// monthly growth trend).
platformSettingsRouter.get("/reports/export", async (req, res) => {
  const expiringDays = Math.min(365, Math.max(1, Number(req.query.expiringDays) || 30));
  const growthMonths = Math.min(24, Math.max(1, Number(req.query.months) || 6));
  const report = await buildReport(expiringDays, growthMonths);

  const csvEscape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const row = (cells: unknown[]) => cells.map(csvEscape).join(",");
  const lines: string[] = [];

  lines.push("Summary");
  lines.push(row(["Active Clients", "Suspended Clients", "Total Orders", "Avg Revenue / Client"]));
  lines.push(row([report.statusCounts.active, report.statusCounts.suspended, report.totalOrders, report.avgRevenuePerTenant]));
  lines.push("");

  lines.push("Revenue by Plan");
  lines.push(row(["Plan", "Clients", "Revenue"]));
  for (const p of report.revenueByPlan) lines.push(row([p.plan, p.count, p.revenue]));
  lines.push("");

  lines.push("Top Clients by Revenue");
  lines.push(row(["Name", "Plan", "Revenue"]));
  for (const t of report.topTenants) lines.push(row([t.name, t.plan, t.totalRevenue]));
  lines.push("");

  lines.push(`Plans Expiring Within ${expiringDays} Days`);
  lines.push(row(["Name", "Plan", "Expiry"]));
  for (const t of report.expiringPlans) lines.push(row([t.name, t.plan, t.planExpiry?.toISOString() ?? ""]));
  lines.push("");

  lines.push(`Monthly Growth (last ${growthMonths} months)`);
  lines.push(row(["Month", "New Signups", "Orders", "Revenue"]));
  for (const m of report.growthTrend) lines.push(row([m.label, m.newTenants, m.orderCount, m.revenue]));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="platform-report-${Date.now()}.csv"`);
  res.send(lines.join("\n"));
});
