import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma";
import { createOrderWithNumber, deductStockForOrder } from "./orders";

// Unauthenticated, internet-facing routes for QR-code table ordering.
// No requireAuth/requireTenant here — anyone with a table's QR code can
// hit these — so this gets its own tighter limiter on top of the global
// apiLimiter already mounted on /api.
export const publicRouter = Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
publicRouter.use(publicLimiter);

publicRouter.get("/:tenantId/menu", async (req, res) => {
  const { tenantId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({ where: { tenantId } }),
    prisma.menuItem.findMany({
      where: { tenantId, available: true },
      include: { category: true, variants: true, addons: true },
    }),
  ]);

  res.json({
    tenantName: tenant.name,
    categories: categories.map((c) => c.name),
    items,
  });
});

publicRouter.get("/:tenantId/tables/:tableId", async (req, res) => {
  const { tenantId, tableId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const table = await prisma.table.findFirst({ where: { id: tableId, tenantId } });
  if (!table) return res.status(404).json({ error: "Table not found" });
  res.json({ id: table.id, number: table.number });
});

const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().default(0),
  notes: z.string().default(""),
});

const publicOrderSchema = z.object({
  tableId: z.string(),
  customerName: z.string().default("Walk-in Customer"),
  notes: z.string().default(""),
  items: z.array(orderItemSchema).min(1),
  amount: z.number().nonnegative(),
});

publicRouter.post("/:tenantId/orders", async (req, res) => {
  const { tenantId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const parsed = publicOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const table = await prisma.table.findFirst({ where: { id: parsed.data.tableId, tenantId } });
  if (!table) return res.status(404).json({ error: "Table not found" });

  const { items, tableId, ...rest } = parsed.data;
  const order = await createOrderWithNumber(
    tenantId,
    { ...rest, orderType: "dine_in", tableId, source: "customer" },
    items
  );
  await deductStockForOrder(tenantId, order.orderNumber, items);
  await prisma.kitchenTicket.create({ data: { tenantId, orderId: order.id, orderNumber: order.orderNumber } });
  await prisma.table.update({ where: { id: tableId }, data: { status: "occupied" } });

  res.status(201).json({ orderNumber: order.orderNumber });
});
