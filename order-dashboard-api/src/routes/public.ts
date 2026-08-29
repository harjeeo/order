import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma";
import { createOrderWithNumber, deductStockForOrder } from "./orders";
import { notifyOutlet } from "../socket";

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

publicRouter.get("/:tenantId/tables/:tableId", async (req, res) => {
  const { tenantId, tableId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const table = await prisma.table.findFirst({ where: { id: tableId, tenantId } });
  if (!table) return res.status(404).json({ error: "Table not found" });
  res.json({ id: table.id, number: table.number, outletId: table.outletId });
});

// The menu is scoped to the table's own outlet — a tenant can run several
// branches, each with its own menu, and the table's QR code is the only
// signal an unauthenticated customer request carries for which one.
publicRouter.get("/:tenantId/tables/:tableId/menu", async (req, res) => {
  const { tenantId, tableId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const table = await prisma.table.findFirst({ where: { id: tableId, tenantId } });
  if (!table) return res.status(404).json({ error: "Table not found" });

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({ where: { outletId: table.outletId } }),
    prisma.menuItem.findMany({
      where: { outletId: table.outletId, available: true },
      include: { category: true, variants: true, addons: true },
    }),
  ]);

  res.json({
    tenantName: tenant.name,
    categories: categories.map((c) => c.name),
    items,
  });
});

const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().default(0),
  notes: z.string().default(""),
});

// --- Slug-based public storefront (no table/QR code needed) --------------
// A standing link (pos.getojar.com/menu/:slug) a cafe can put in their
// Instagram bio or anywhere on social — same public menu/ordering
// experience as the table QR flow, minus the table context, so orders
// come in as takeaway.

publicRouter.get("/menu/:slug", async (req, res) => {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const outlet = await prisma.outlet.findFirst({ where: { tenantId: tenant.id }, orderBy: { isDefault: "desc" } });
  if (!outlet) return res.status(404).json({ error: "Not found" });

  const settings = await prisma.settings.findUnique({ where: { tenantId: tenant.id } });
  const restaurant = (settings?.restaurant as any) ?? {};

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({ where: { outletId: outlet.id } }),
    prisma.menuItem.findMany({
      where: { outletId: outlet.id, available: true },
      include: { category: true, variants: true, addons: true },
    }),
  ]);

  res.json({
    tenantName: tenant.name,
    logo: restaurant.logo ?? "",
    about: restaurant.about ?? "",
    categories: categories.map((c) => c.name),
    items,
  });
});

const publicMenuOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Enter your name"),
  customerPhone: z.string().trim().min(7, "Enter a valid phone number"),
  notes: z.string().default(""),
  items: z.array(orderItemSchema).min(1),
  amount: z.number().nonnegative(),
});

publicRouter.post("/menu/:slug/orders", async (req, res) => {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const outlet = await prisma.outlet.findFirst({ where: { tenantId: tenant.id }, orderBy: { isDefault: "desc" } });
  if (!outlet) return res.status(404).json({ error: "Not found" });

  const parsed = publicMenuOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const { items, customerPhone, ...rest } = parsed.data;

  let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { tenantId: tenant.id, name: rest.customerName, phone: customerPhone } });
  }

  const order = await createOrderWithNumber(
    tenant.id,
    { ...rest, orderType: "takeaway", outletId: outlet.id, source: "customer", customerId: customer.id },
    items
  );
  await deductStockForOrder(tenant.id, order.orderNumber, items);
  await prisma.kitchenTicket.create({ data: { tenantId: tenant.id, orderId: order.id, orderNumber: order.orderNumber } });
  notifyOutlet(outlet.id, "orders:changed");
  notifyOutlet(outlet.id, "kitchen:changed");

  res.status(201).json({ orderNumber: order.orderNumber });
});

const publicOrderSchema = z.object({
  tableId: z.string(),
  customerName: z.string().trim().min(1, "Enter your name"),
  customerPhone: z.string().trim().min(7, "Enter a valid phone number"),
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

  const { items, tableId, customerPhone, ...rest } = parsed.data;

  // Same phone ordering again (a repeat visit, or a second round at the
  // same table) reuses their existing profile instead of creating
  // duplicates — this is also what feeds the Customers list for marketing.
  let customer = await prisma.customer.findFirst({ where: { tenantId, phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { tenantId, name: rest.customerName, phone: customerPhone } });
  }

  const order = await createOrderWithNumber(
    tenantId,
    { ...rest, orderType: "dine_in", tableId, outletId: table.outletId, source: "customer", customerId: customer.id },
    items
  );
  await deductStockForOrder(tenantId, order.orderNumber, items);
  await prisma.kitchenTicket.create({ data: { tenantId, orderId: order.id, orderNumber: order.orderNumber } });
  notifyOutlet(table.outletId, "orders:changed");
  notifyOutlet(table.outletId, "kitchen:changed");
  await prisma.table.update({ where: { id: tableId }, data: { status: "occupied" } });

  res.status(201).json({ orderNumber: order.orderNumber });
});
