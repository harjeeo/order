import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireTenant);

async function loadReportData(tenantId: string) {
  const [orders, invoices, ingredients, movements, expenses, menuItems] = await Promise.all([
    prisma.order.findMany({ where: { tenantId }, include: { items: true } }),
    prisma.invoice.findMany({ where: { tenantId } }),
    prisma.ingredient.findMany({ where: { tenantId } }),
    prisma.stockMovement.findMany({ where: { tenantId, type: "wastage" } }),
    prisma.expense.findMany({ where: { tenantId } }),
    prisma.menuItem.findMany({ where: { tenantId }, include: { category: true } }),
  ]);
  return { orders, invoices, ingredients, movements, expenses, menuItems };
}

function bestSellersFrom(orders: Awaited<ReturnType<typeof loadReportData>>["orders"]) {
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const itemSales: Record<string, { qty: number; revenue: number }> = {};
  for (const order of nonCancelled) {
    for (const item of order.items) {
      itemSales[item.name] ??= { qty: 0, revenue: 0 };
      itemSales[item.name].qty += item.qty;
      itemSales[item.name].revenue += item.qty * item.unitPrice;
    }
  }
  return Object.entries(itemSales)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

reportsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const { orders, invoices, ingredients, movements, expenses, menuItems } = await loadReportData(tenantId);

  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const completed = orders.filter((o) => o.status === "completed");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const totalSales = nonCancelled.reduce((s, o) => s + o.amount, 0);

  const paymentTotals: Record<string, number> = { cash: 0, upi: 0, card: 0, split: 0 };
  for (const inv of invoices) {
    if (paymentTotals[inv.method] !== undefined) paymentTotals[inv.method] += inv.total;
  }

  const bestSellers = bestSellersFrom(orders).slice(0, 5);

  // Best-effort: order items only store a name, so category is matched by
  // name prefix against the current menu (variant labels like "Cheese
  // Burger (Cheese)" still match "Cheese Burger").
  const categorySales: Record<string, number> = {};
  for (const { name, revenue } of bestSellersFrom(orders)) {
    const menuItem = menuItems.find((m) => name.startsWith(m.name));
    const category = menuItem?.category.name ?? "Other";
    categorySales[category] = (categorySales[category] ?? 0) + revenue;
  }

  const trend = [6, 5, 4, 3, 2, 1, 0].map((n) => {
    const day = new Date();
    day.setDate(day.getDate() - n);
    const dateStr = day.toISOString().slice(0, 10);
    const amount = nonCancelled
      .filter((o) => o.createdAt.toISOString().slice(0, 10) === dateStr)
      .reduce((s, o) => s + o.amount, 0);
    return { label: dateStr.slice(5), amount };
  });

  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
  }

  res.json({
    sales: { total: totalSales, trend },
    orders: {
      total: orders.length,
      completed: completed.length,
      cancelled: cancelled.length,
      avgOrderValue: nonCancelled.length ? Math.round(totalSales / nonCancelled.length) : 0,
    },
    products: { bestSellers, categorySales },
    payments: paymentTotals,
    inventory: {
      totalIngredients: ingredients.length,
      lowStock: ingredients.filter((i) => i.stock > 0 && i.stock <= i.minimum).length,
      outOfStock: ingredients.filter((i) => i.stock <= 0).length,
      wastageTotal: movements.reduce((s, m) => s + m.qty, 0),
    },
    expenses: {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      byCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
    },
  });
});

// Today's-overview stats for the Cafe dashboard landing page.
reportsRouter.get("/dashboard", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, ingredients] = await Promise.all([
    prisma.order.findMany({ where: { tenantId, createdAt: { gte: startOfDay } }, include: { items: true } }),
    prisma.ingredient.findMany({ where: { tenantId } }),
  ]);

  const nonCancelled = todayOrders.filter((o) => o.status !== "cancelled");
  const todaySales = nonCancelled.reduce((s, o) => s + o.amount, 0);

  const salesByHour = [6, 5, 4, 3, 2, 1, 0].map((n) => {
    const hour = new Date();
    hour.setHours(hour.getHours() - n, 0, 0, 0);
    const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
    const amount = nonCancelled
      .filter((o) => o.createdAt >= hour && o.createdAt < nextHour)
      .reduce((s, o) => s + o.amount, 0);
    return { time: hour.toTimeString().slice(0, 5), amount };
  });

  res.json({
    todaySales,
    todayOrders: todayOrders.length,
    pendingOrders: todayOrders.filter((o) => o.status === "pending" || o.status === "preparing").length,
    completedOrders: todayOrders.filter((o) => o.status === "completed").length,
    totalRevenue: todaySales,
    orderTypeSummary: {
      dineIn: nonCancelled.filter((o) => o.orderType === "dine_in").length,
      takeaway: nonCancelled.filter((o) => o.orderType === "takeaway").length,
      delivery: nonCancelled.filter((o) => o.orderType === "delivery").length,
    },
    bestSellingItems: bestSellersFrom(todayOrders).slice(0, 5),
    lowStockItems: ingredients
      .filter((i) => i.stock <= i.minimum)
      .map((i) => ({ ingredient: i.name, stock: `${i.stock} ${i.unit}`, minimum: `${i.minimum} ${i.unit}` })),
    salesByHour,
  });
});
