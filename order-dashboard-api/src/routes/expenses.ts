import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const expensesRouter = Router();
expensesRouter.use(requireAuth, requireTenant);

expensesRouter.get("/", async (req, res) => {
  const { category, search = "" } = req.query as { category?: string; search?: string };
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId: req.user!.tenantId!,
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
    data: { tenantId: req.user!.tenantId!, category, amount, date: new Date(date), method, notes },
  });
  res.status(201).json(expense);
});

expensesRouter.delete("/:id", async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
