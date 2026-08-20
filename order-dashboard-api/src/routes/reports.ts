import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireTenant);

reportsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId!;

  const [orders, invoices, ingredients, movements, expenses] = await Promise.all([
    prisma.order.findMany({ where: { tenantId }, include: { items: true } }),
    prisma.invoice.findMany({ where: { tenantId } }),
    prisma.ingredient.findMany({ where: { tenantId } }),
    prisma.stockMovement.findMany({ where: { tenantId, type: "wastage" } }),
    prisma.expense.findMany({ where: { tenantId } }),
  ]);

  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const completed = orders.filter((o) => o.status === "completed");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const totalSales = nonCancelled.reduce((s, o) => s + o.amount, 0);

  const paymentTotals: Record<string, number> = { cash: 0, upi: 0, card: 0, split: 0 };
  for (const inv of invoices) {
    if (paymentTotals[inv.method] !== undefined) paymentTotals[inv.method] += inv.total;
  }

  const itemSales: Record<string, { qty: number; revenue: number }> = {};
  for (const order of nonCancelled) {
    for (const item of order.items) {
      itemSales[item.name] ??= { qty: 0, revenue: 0 };
      itemSales[item.name].qty += item.qty;
      itemSales[item.name].revenue += item.qty * item.unitPrice;
    }
  }
  const bestSellers = Object.entries(itemSales)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  res.json({
    sales: { total: totalSales },
    orders: {
      total: orders.length,
      completed: completed.length,
      cancelled: cancelled.length,
      avgOrderValue: nonCancelled.length ? Math.round(totalSales / nonCancelled.length) : 0,
    },
    products: { bestSellers },
    payments: paymentTotals,
    inventory: {
      totalIngredients: ingredients.length,
      lowStock: ingredients.filter((i) => i.stock > 0 && i.stock <= i.minimum).length,
      outOfStock: ingredients.filter((i) => i.stock <= 0).length,
      wastageTotal: movements.reduce((s, m) => s + m.qty, 0),
    },
    expenses: { total: expenses.reduce((s, e) => s + e.amount, 0) },
  });
});
