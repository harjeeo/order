import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(requireAuth, requireTenant, requireOutlet);

// The one place that means "this table just started being used" — stamps
// occupiedAt (for the running-time badge on the table card) alongside the
// status flag, and only on the transition into occupied so a second order
// on an already-occupied table doesn't reset its timer. Every place that
// opens a table (new dine-in order, manual status change, reservation
// check-in, a customer's own QR order) should go through this rather than
// setting `status: "occupied"` by hand and risking occupiedAt drifting out
// of sync with it.
export async function occupyTable(tableId: string, currentStatus: string) {
  if (currentStatus === "occupied") return;
  await prisma.table.update({ where: { id: tableId }, data: { status: "occupied", occupiedAt: new Date() } });
}

// Attaches each table's running (unpaid, non-cancelled) bill: the total
// amount across all its open orders, plus the most recent one's id/number/
// items so the table card can offer a one-click reprint without a second
// round trip.
async function withRunningBills(outletId: string, tables: { id: string }[]) {
  const tableIds = tables.map((t) => t.id);
  const orders = tableIds.length
    ? await prisma.order.findMany({
        where: { outletId, tableId: { in: tableIds }, paymentStatus: "unpaid", status: { not: "cancelled" } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const amountByTable = new Map<string, number>();
  const latestByTable = new Map<string, (typeof orders)[number]>();
  for (const o of orders) {
    if (!o.tableId) continue;
    amountByTable.set(o.tableId, (amountByTable.get(o.tableId) ?? 0) + o.amount);
    if (!latestByTable.has(o.tableId)) latestByTable.set(o.tableId, o);
  }

  return tables.map((t) => {
    const latest = latestByTable.get(t.id);
    return {
      ...t,
      runningAmount: amountByTable.get(t.id) ?? 0,
      activeOrder: latest
        ? {
            id: latest.id,
            orderNumber: latest.orderNumber,
            items: latest.items.map((i) => ({ name: i.name, qty: i.qty })),
          }
        : null,
    };
  });
}

tablesRouter.get("/", async (req, res) => {
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! }, orderBy: { number: "asc" } });
  res.json(await withRunningBills(req.outletId!, tables));
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

  const newStatus = req.body.status;
  if (newStatus === "occupied") {
    await occupyTable(existing.id, existing.status);
  } else {
    const data: { status: string; occupiedAt?: null } = { status: newStatus };
    if (newStatus === "available") data.occupiedAt = null;
    await prisma.table.update({ where: { id: existing.id }, data: data as any });
  }

  const table = await prisma.table.findUniqueOrThrow({ where: { id: existing.id } });
  res.json(table);
});

// Moves the "active" state of one table onto another (transfer an order
// mid-service), freeing the source table. Re-points the source's open
// orders too, not just the status flag, so the running bill/timer follow
// the order to its new table instead of staying stuck on the old one.
tablesRouter.post("/:id/transfer/:toId", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const from = await prisma.table.findFirst({ where: { id: req.params.id, tenantId } });
  if (!from) return res.status(404).json({ error: "Not found" });
  const to = await prisma.table.findFirst({ where: { id: req.params.toId, tenantId } });
  if (!to) return res.status(404).json({ error: "Not found" });

  await prisma.order.updateMany({
    where: { tableId: from.id, tenantId, paymentStatus: "unpaid", status: { not: "cancelled" } },
    data: { tableId: to.id },
  });
  await prisma.table.update({ where: { id: to.id }, data: { status: from.status, occupiedAt: from.occupiedAt } });
  await prisma.table.update({ where: { id: from.id }, data: { status: "available", occupiedAt: null } });
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! } });
  res.json(await withRunningBills(req.outletId!, tables));
});

tablesRouter.post("/merge", async (req, res) => {
  const { sourceIds, targetId } = req.body as { sourceIds: string[]; targetId: string };
  const tenantId = req.user!.tenantId!;
  const target = await prisma.table.findFirst({ where: { id: targetId, tenantId } });
  if (!target) return res.status(404).json({ error: "Not found" });
  const sources = sourceIds.filter((id) => id !== targetId);

  await prisma.order.updateMany({
    where: { tableId: { in: sources }, tenantId, paymentStatus: "unpaid", status: { not: "cancelled" } },
    data: { tableId: targetId },
  });
  await occupyTable(target.id, target.status);
  await prisma.table.updateMany({
    where: { id: { in: sources }, tenantId },
    data: { status: "available", occupiedAt: null },
  });
  const tables = await prisma.table.findMany({ where: { outletId: req.outletId! } });
  res.json(await withRunningBills(req.outletId!, tables));
});
