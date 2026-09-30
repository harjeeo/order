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
  const { category, amount, date, method, notes, employeeName } = req.body;
  const expense = await prisma.expense.create({
    data: {
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
      category,
      amount,
      date: new Date(date),
      method,
      notes,
      employeeName: employeeName ?? "",
    },
  });
  res.status(201).json(expense);
});

// Bulk grid entry (Petpooja-style "Add 10 Rows"): only rows with a
// category and a positive amount are kept, everything else is silently
// dropped rather than rejected — matches the grid's own "only filled rows
// get saved" note, so a half-filled row isn't an error.
expensesRouter.post("/bulk", async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const valid = rows.filter((r: any) => r && r.category && Number(r.amount) > 0);
  if (valid.length === 0) return res.status(400).json({ error: "Add at least one row with a reason and amount." });

  const { count } = await prisma.expense.createMany({
    data: valid.map((r: any) => ({
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
      category: String(r.category),
      amount: Number(r.amount),
      date: r.date ? new Date(r.date) : new Date(),
      method: String(r.method || "Cash"),
      notes: String(r.notes || ""),
      employeeName: String(r.employeeName || ""),
    })),
  });
  res.status(201).json({ count });
});

expensesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });

  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
