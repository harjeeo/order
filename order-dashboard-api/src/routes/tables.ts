import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(requireAuth, requireTenant);

tablesRouter.get("/", async (req, res) => {
  const tables = await prisma.table.findMany({ where: { tenantId: req.user!.tenantId! }, orderBy: { number: "asc" } });
  res.json(tables);
});

tablesRouter.post("/", async (req, res) => {
  const { number, capacity } = req.body;
  const table = await prisma.table.create({ data: { tenantId: req.user!.tenantId!, number, capacity } });
  res.status(201).json(table);
});

tablesRouter.patch("/:id/status", async (req, res) => {
  const table = await prisma.table.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json(table);
});

// Moves the "active" state of one table onto another (transfer an order
// mid-service), freeing the source table.
tablesRouter.post("/:id/transfer/:toId", async (req, res) => {
  const from = await prisma.table.findUnique({ where: { id: req.params.id } });
  if (!from) return res.status(404).json({ error: "Not found" });
  await prisma.table.update({ where: { id: req.params.toId }, data: { status: from.status } });
  await prisma.table.update({ where: { id: req.params.id }, data: { status: "available" } });
  const tables = await prisma.table.findMany({ where: { tenantId: req.user!.tenantId! } });
  res.json(tables);
});

tablesRouter.post("/merge", async (req, res) => {
  const { sourceIds, targetId } = req.body as { sourceIds: string[]; targetId: string };
  await prisma.table.update({ where: { id: targetId }, data: { status: "occupied" } });
  await prisma.table.updateMany({
    where: { id: { in: sourceIds.filter((id) => id !== targetId) } },
    data: { status: "available" },
  });
  const tables = await prisma.table.findMany({ where: { tenantId: req.user!.tenantId! } });
  res.json(tables);
});
