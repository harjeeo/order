import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const cashFlowRouter = Router();
cashFlowRouter.use(requireAuth, requireTenant, requireOutlet);

cashFlowRouter.get("/", async (req, res) => {
  const { type } = req.query as { type?: string };
  const tenantId = req.user!.tenantId!;
  const outletId = req.outletId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const where = {
    tenantId,
    outletId,
    ...(type === "topup" || type === "withdrawal" ? { type: type as "topup" | "withdrawal" } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.cashMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashMovement.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

cashFlowRouter.post("/", async (req, res) => {
  const type = req.body.type;
  if (type !== "topup" && type !== "withdrawal") {
    return res.status(400).json({ error: "type must be \"topup\" or \"withdrawal\"" });
  }
  const amount = Math.round(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a positive amount." });

  const staffUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const movement = await prisma.cashMovement.create({
    data: {
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
      type,
      amount,
      reason: String(req.body.reason || "").slice(0, 300),
      createdBy: staffUser?.name ?? req.user!.email,
    },
  });
  res.status(201).json(movement);
});

cashFlowRouter.delete("/:id", async (req, res) => {
  await prisma.cashMovement.deleteMany({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  res.json({ ok: true });
});
