import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const billingRouter = Router();
billingRouter.use(requireAuth, requireTenant);

billingRouter.get("/billable-orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { tenantId: req.user!.tenantId!, paymentStatus: "unpaid", status: { not: "cancelled" } },
    include: { items: true, table: true },
  });
  res.json(orders);
});

billingRouter.get("/invoices", async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId: req.user!.tenantId! },
    orderBy: { createdAt: "desc" },
    include: { order: true },
  });
  res.json(invoices);
});

let invoiceCounter = 5000;

billingRouter.post("/orders/:orderId/pay", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { subtotal, discountAmount = 0, serviceChargeAmount = 0, taxAmount = 0, roundOff = 0, total, method } = req.body;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      orderId: order.id,
      invoiceNumber: `INV-${++invoiceCounter}`,
      customerName: order.customerName,
      subtotal,
      discountAmount,
      serviceChargeAmount,
      taxAmount,
      roundOff,
      total,
      method,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "paid", status: order.status === "pending" ? "completed" : order.status },
  });

  res.status(201).json(invoice);
});

billingRouter.post("/invoices/:id/refund", async (req, res) => {
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { refunded: true } });
  await prisma.order.update({ where: { id: invoice.orderId }, data: { paymentStatus: "refunded" } });
  res.json(invoice);
});
