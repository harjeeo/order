import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(requireAuth, requireTenant);

customersRouter.get("/", async (req, res) => {
  const { search = "" } = req.query as { search?: string };
  const tenantId = req.user!.tenantId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const where = {
    tenantId,
    OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }],
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { orders: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    items: customers.map((c) => ({
      ...c,
      totalOrders: c.orders.length,
      totalSpent: c.orders.reduce((s, o) => s + o.amount, 0),
      lastOrderAt: c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt ?? null,
      orders: undefined,
    })),
    total,
    page,
    pageSize,
  });
});

customersRouter.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
});

customersRouter.get("/:id/orders", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  const orders = await prisma.order.findMany({
    where: { customerId: req.params.id, tenantId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

customersRouter.post("/", async (req, res) => {
  const { name, phone, email, address } = req.body;
  const customer = await prisma.customer.create({ data: { tenantId: req.user!.tenantId!, name, phone, email, address } });
  res.status(201).json(customer);
});

// Deliberately excludes loyaltyPoints/walletBalance — those only move
// through the dedicated, audited paths (billing settlement, wallet top-up),
// never as a free-form field edit.
const updateCustomerSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
  })
  .strict();

customersRouter.patch("/:id", async (req, res) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const tenantId = req.user!.tenantId!;
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Customer not found" });
  const customer = await prisma.customer.update({ where: { id: existing.id }, data: parsed.data });
  res.json(customer);
});

customersRouter.post("/:id/wallet/topup", async (req, res) => {
  const amount = Math.round(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a positive amount." });

  const tenantId = req.user!.tenantId!;
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Customer not found" });

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: { walletBalance: existing.walletBalance + amount },
  });
  res.json(customer);
});

customersRouter.delete("/:id", async (req, res) => {
  await prisma.customer.deleteMany({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  res.json({ ok: true });
});
