import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";
import { couponError } from "./coupons";

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
  const tenantId = req.user!.tenantId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { order: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where: { tenantId } }),
  ]);

  res.json({ items, total, page, pageSize });
});

// See orders.ts's createOrderWithNumber for why this isn't an in-memory counter.
async function createInvoiceWithNumber(tenantId: string, data: any) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${5001 + count + attempt}`;
    try {
      return await prisma.invoice.create({ data: { ...data, tenantId, invoiceNumber } });
    } catch (err: any) {
      if (err.code !== "P2002") throw err;
    }
  }
  throw new Error("Could not allocate an invoice number");
}

// 1 loyalty point earned per ₹100 spent, 1 point = ₹1 when redeemed.
const LOYALTY_EARN_RATE = 100;

billingRouter.post("/orders/:orderId/pay", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { subtotal, discountAmount = 0, serviceChargeAmount = 0, taxAmount = 0, roundOff = 0, total, method } = req.body;
  const tipAmount = Math.max(0, Math.round(Number(req.body.tipAmount) || 0));
  const redeemPoints = Math.max(0, Math.floor(Number(req.body.redeemPoints) || 0));
  const couponCode = req.body.couponCode ? String(req.body.couponCode).trim().toUpperCase() : "";

  // Re-checked here (not just at /coupons/validate) so two staff can't
  // both redeem the last use of a maxUses coupon in a race, and so a
  // coupon can't be deactivated/expired between preview and payment.
  let coupon = null;
  if (couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { tenantId_code: { tenantId, code: couponCode } } });
    const error = couponError(coupon);
    if (error) return res.status(400).json({ error });
  }

  let pointsEarned = 0;
  let customerPointsBalance: number | null = null;

  if (order.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
    if (customer) {
      if (redeemPoints > customer.loyaltyPoints) {
        return res.status(400).json({ error: `Customer only has ${customer.loyaltyPoints} points available` });
      }
      pointsEarned = Math.floor(total / LOYALTY_EARN_RATE);
      const updatedCustomer = await prisma.customer.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: customer.loyaltyPoints - redeemPoints + pointsEarned },
      });
      customerPointsBalance = updatedCustomer.loyaltyPoints;
    }
  }

  const invoice = await createInvoiceWithNumber(tenantId, {
    orderId: order.id,
    customerName: order.customerName,
    subtotal,
    discountAmount,
    serviceChargeAmount,
    taxAmount,
    roundOff,
    total,
    tipAmount,
    couponCode,
    method,
  });

  if (coupon) {
    await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "paid", status: order.status === "pending" ? "completed" : order.status },
  });

  res.status(201).json({ ...invoice, pointsEarned, customerPointsBalance });
});

billingRouter.post("/invoices/:id/refund", async (req, res) => {
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { refunded: true } });
  await prisma.order.update({ where: { id: invoice.orderId }, data: { paymentStatus: "refunded" } });
  res.json(invoice);
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).default(""),
});

// Quick post-payment rating popup (Billing page) writes here — shown as
// average rating + recent notes on the Cafe Reports page.
billingRouter.post("/invoices/:id/feedback", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { rating: parsed.data.rating, feedbackNote: parsed.data.note },
  });
  res.json(updated);
});
