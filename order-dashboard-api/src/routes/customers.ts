import { Router } from "express";
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

customersRouter.get("/:id/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.params.id },
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

customersRouter.patch("/:id", async (req, res) => {
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  res.json(customer);
});

customersRouter.delete("/:id", async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
