import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const expensesRouter = Router();
expensesRouter.use(requireAuth, requireTenant, requireOutlet);

expensesRouter.get("/", async (req, res) => {
  const { category, search = "" } = req.query as { category?: string; search?: string };
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
      ...(category && category !== "All" ? { category } : {}),
      notes: { contains: search, mode: "insensitive" },
    },
    orderBy: { date: "desc" },
  });
  res.json(expenses);
});

expensesRouter.post("/", async (req, res) => {
  const { category, amount, date, method, notes } = req.body;
  const expense = await prisma.expense.create({
    data: { tenantId: req.user!.tenantId!, outletId: req.outletId!, category, amount, date: new Date(date), method, notes },
  });
  res.status(201).json(expense);
});

expensesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });

  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
