import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const shiftsRouter = Router();
shiftsRouter.use(requireAuth, requireTenant);

shiftsRouter.get("/me/active", async (req, res) => {
  const shift = await prisma.shift.findFirst({
    where: { tenantId: req.user!.tenantId!, userId: req.user!.id, clockOut: null },
  });
  res.json(shift);
});

shiftsRouter.post("/clock-in", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.id;

  const existing = await prisma.shift.findFirst({ where: { tenantId, userId, clockOut: null } });
  if (existing) return res.status(409).json({ error: "Already clocked in" });

  const shift = await prisma.shift.create({ data: { tenantId, userId } });
  res.status(201).json(shift);
});

shiftsRouter.post("/clock-out", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.id;

  const existing = await prisma.shift.findFirst({ where: { tenantId, userId, clockOut: null } });
  if (!existing) return res.status(409).json({ error: "Not currently clocked in" });

  const shift = await prisma.shift.update({ where: { id: existing.id }, data: { clockOut: new Date() } });
  res.json(shift);
});

// Attendance history across the whole tenant — used by the Attendance page.
shiftsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30));

  const [items, total] = await Promise.all([
    prisma.shift.findMany({
      where: { tenantId },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { clockIn: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shift.count({ where: { tenantId } }),
  ]);

  res.json({ items, total, page, pageSize });
});
