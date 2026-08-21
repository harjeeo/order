import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const kitchenRouter = Router();
kitchenRouter.use(requireAuth, requireTenant, requireOutlet);

kitchenRouter.get("/", async (req, res) => {
  const tickets = await prisma.kitchenTicket.findMany({
    where: { tenantId: req.user!.tenantId!, order: { outletId: req.outletId! } },
    include: { order: { include: { items: true, table: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(tickets);
});

kitchenRouter.patch("/:id/status", async (req, res) => {
  const ticket = await prisma.kitchenTicket.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json(ticket);
});

kitchenRouter.post("/:id/toggle-priority", async (req, res) => {
  const ticket = await prisma.kitchenTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.kitchenTicket.update({ where: { id: req.params.id }, data: { priority: !ticket.priority } });
  res.json(updated);
});
