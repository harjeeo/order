import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";
import { sendSms } from "../lib/sms";

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
  const ticket = await prisma.kitchenTicket.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: { order: true },
  });

  // Best-effort — never blocks the status update if the customer has no
  // phone on file or SMS isn't configured (see lib/sms.ts).
  if (ticket.status === "ready" && ticket.order.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: ticket.order.customerId } });
    if (customer?.phone) {
      sendSms(ticket.tenantId, customer.phone, `Your order ${ticket.orderNumber} is ready for pickup!`).catch(() => {});
    }
  }

  res.json(ticket);
});

kitchenRouter.post("/:id/toggle-priority", async (req, res) => {
  const ticket = await prisma.kitchenTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.kitchenTicket.update({ where: { id: req.params.id }, data: { priority: !ticket.priority } });
  res.json(updated);
});
