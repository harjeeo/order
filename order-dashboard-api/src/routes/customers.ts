import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(requireAuth, requireTenant);

customersRouter.get("/", async (req, res) => {
  const { search = "" } = req.query as { search?: string };
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: req.user!.tenantId!,
      OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }],
    },
    include: { orders: true },
  });
  res.json(
    customers.map((c) => ({
      ...c,
      totalOrders: c.orders.length,
      totalSpent: c.orders.reduce((s, o) => s + o.amount, 0),
      lastOrderAt: c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt ?? null,
      orders: undefined,
    }))
  );
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
