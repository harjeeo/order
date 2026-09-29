import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(requireAuth, requireTenant, requireOutlet);

tablesRouter.get("/", async (req, res) => {
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! }, orderBy: { number: "asc" } });
  res.json(tables);
});

tablesRouter.post("/", async (req, res) => {
  const { number, capacity } = req.body;
  const table = await prisma.table.create({ data: { tenantId: req.user!.tenantId!, outletId: req.outletId!, number, capacity } });
  res.status(201).json(table);
});

tablesRouter.patch("/:id/status", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const existing = await prisma.table.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const table = await prisma.table.update({ where: { id: existing.id }, data: { status: req.body.status } });
  res.json(table);
});

// Moves the "active" state of one table onto another (transfer an order
// mid-service), freeing the source table.
tablesRouter.post("/:id/transfer/:toId", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const from = await prisma.table.findFirst({ where: { id: req.params.id, tenantId } });
  if (!from) return res.status(404).json({ error: "Not found" });
  const to = await prisma.table.findFirst({ where: { id: req.params.toId, tenantId } });
  if (!to) return res.status(404).json({ error: "Not found" });
  await prisma.table.update({ where: { id: to.id }, data: { status: from.status } });
  await prisma.table.update({ where: { id: from.id }, data: { status: "available" } });
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! } });
  res.json(tables);
});

tablesRouter.post("/merge", async (req, res) => {
  const { sourceIds, targetId } = req.body as { sourceIds: string[]; targetId: string };
  const tenantId = req.user!.tenantId!;
  const target = await prisma.table.findFirst({ where: { id: targetId, tenantId } });
  if (!target) return res.status(404).json({ error: "Not found" });
  await prisma.table.update({ where: { id: target.id }, data: { status: "occupied" } });
  await prisma.table.updateMany({
    where: { id: { in: sourceIds.filter((id) => id !== targetId) }, tenantId },
    data: { status: "available" },
  });
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! } });
  res.json(tables);
});
