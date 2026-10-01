import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const dayEndRouter = Router();
dayEndRouter.use(requireAuth, requireTenant, requireOutlet);

// The open period always runs from the last closing's periodEnd to now —
// so the first-ever closing for an outlet covers everything since it was
// created, and every closing after that picks up exactly where the last
// one left off (no gaps, no double-counting).
async function periodStartFor(tenantId: string, outletId: string) {
  const last = await prisma.dayEndClosing.findFirst({
    where: { tenantId, outletId },
    orderBy: { periodEnd: "desc" },
  });
  if (last) return last.periodEnd;
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  return outlet?.createdAt ?? new Date(0);
}

async function summarizePeriod(tenantId: string, outletId: string, since: Date, until: Date) {
  const orders = await prisma.order.findMany({
    where: { tenantId, outletId, createdAt: { gte: since, lt: until } },
    include: { invoices: true },
  });

  const totals = {
    successOrders: 0,
    successAmount: 0,
    cancelledOrders: 0,
    cancelledAmount: 0,
    complimentaryOrders: 0,
    complimentaryAmount: 0,
    salesReturnOrders: 0,
    salesReturnAmount: 0,
    dueOrders: 0,
    dueAmount: 0,
    onlineOrders: 0,
    onlineAmount: 0,
  };

  for (const order of orders) {
    if (order.source === "customer") {
      totals.onlineOrders += 1;
      totals.onlineAmount += order.amount;
    }

    const method = order.invoices[0]?.method;
    if (order.status === "cancelled") {
      totals.cancelledOrders += 1;
      totals.cancelledAmount += order.amount;
    } else if (method === "complimentary") {
      totals.complimentaryOrders += 1;
      totals.complimentaryAmount += order.amount;
    } else if (method === "sales_return") {
      totals.salesReturnOrders += 1;
      totals.salesReturnAmount += Math.abs(order.amount);
    } else if (order.paymentStatus === "unpaid") {
      totals.dueOrders += 1;
      totals.dueAmount += order.amount;
    } else {
      totals.successOrders += 1;
      totals.successAmount += order.amount;
    }
  }

  const [cashInvoices, cashExpenses, cashTopUps, cashWithdrawals] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId, outletId, method: "cash", createdAt: { gte: since, lt: until } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, outletId, method: "Cash", date: { gte: since, lt: until } },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId, outletId, type: "topup", createdAt: { gte: since, lt: until } },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId, outletId, type: "withdrawal", createdAt: { gte: since, lt: until } },
      _sum: { amount: true },
    }),
  ]);
  const cashSales = cashInvoices._sum.total ?? 0;
  const cashExpenseTotal = cashExpenses._sum.amount ?? 0;
  const cashTopUpTotal = cashTopUps._sum.amount ?? 0;
  const cashWithdrawalTotal = cashWithdrawals._sum.amount ?? 0;
  const expectedCash = cashSales - cashExpenseTotal + cashTopUpTotal - cashWithdrawalTotal;

  return {
    ...totals,
    cashSales,
    cashExpenseTotal,
    cashTopUps: cashTopUpTotal,
    cashWithdrawals: cashWithdrawalTotal,
    expectedCash,
  };
}

dayEndRouter.get("/preview", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const outletId = req.outletId!;
  const since = await periodStartFor(tenantId, outletId);
  const until = new Date();
  const summary = await summarizePeriod(tenantId, outletId, since, until);
  res.json({ periodStart: since, periodEnd: until, ...summary });
});

dayEndRouter.post("/close", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const outletId = req.outletId!;
  const countedCash = Math.round(Number(req.body.countedCash) || 0);
  const notes = String(req.body.notes || "").slice(0, 1000);

  const since = await periodStartFor(tenantId, outletId);
  const until = new Date();
  const summary = await summarizePeriod(tenantId, outletId, since, until);
  const staffUser = await prisma.user.findUnique({ where: { id: req.user!.id } });

  const closing = await prisma.dayEndClosing.create({
    data: {
      tenantId,
      outletId,
      periodStart: since,
      periodEnd: until,
      successOrders: summary.successOrders,
      successAmount: summary.successAmount,
      cancelledOrders: summary.cancelledOrders,
      cancelledAmount: summary.cancelledAmount,
      complimentaryOrders: summary.complimentaryOrders,
      complimentaryAmount: summary.complimentaryAmount,
      salesReturnOrders: summary.salesReturnOrders,
      salesReturnAmount: summary.salesReturnAmount,
      dueOrders: summary.dueOrders,
      dueAmount: summary.dueAmount,
      cashTopUps: summary.cashTopUps,
      cashWithdrawals: summary.cashWithdrawals,
      expectedCash: summary.expectedCash,
      countedCash,
      difference: countedCash - summary.expectedCash,
      closedBy: staffUser?.name ?? req.user!.email,
      notes,
    },
  });
  res.status(201).json(closing);
});

dayEndRouter.get("/history", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const outletId = req.outletId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  const [items, total] = await Promise.all([
    prisma.dayEndClosing.findMany({
      where: { tenantId, outletId },
      orderBy: { periodEnd: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dayEndClosing.count({ where: { tenantId, outletId } }),
  ]);
  res.json({ items, total, page, pageSize });
});
