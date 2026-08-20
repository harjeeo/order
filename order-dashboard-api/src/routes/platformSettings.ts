import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

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

platformSettingsRouter.get("/reports", async (_req, res) => {
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
    .filter((t) => t.planExpiry && (t.planExpiry.getTime() - Date.now()) / 86400000 <= 30)
    .sort((a, b) => (a.planExpiry?.getTime() ?? 0) - (b.planExpiry?.getTime() ?? 0));

  res.json({
    revenueByPlan,
    statusCounts: {
      active: tenants.filter((t) => t.status === "active").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
    },
    topTenants: topTenants.map((r) => ({ ...r.tenant, totalRevenue: r.revenue })),
    expiringPlans,
    totalOrders: revenueByOrders.reduce((s, r) => s + r.orderCount, 0),
    avgRevenuePerTenant: tenants.length
      ? Math.round(revenueByOrders.reduce((s, r) => s + r.revenue, 0) / tenants.length)
      : 0,
  });
});
