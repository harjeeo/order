import { Response, Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma";
import { createOrderWithNumber, deductStockForOrder } from "./orders";
import { occupyTable } from "./tables";
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

// Public orders never trust a client-supplied name/unitPrice/amount — a
// customer's phone is an untrusted client, and taking those at face value
// would let anyone place a real kitchen order at whatever price they typed
// (down to ₹0). Instead the client sends only which item/variant/addons it
// wants; pricePublicOrderItems below looks up every price from the tenant's
// own menu and recomputes the order total server-side.
const orderItemSchema = z.object({
  menuItemId: z.string(),
  variantName: z.string().nullable().optional(),
  addonNames: z.array(z.string()).default([]),
  qty: z.number().int().positive(),
  notes: z.string().default(""),
});

class PublicOrderPricingError extends Error {}

async function pricePublicOrderItems(
  outletId: string,
  rawItems: { menuItemId: string; variantName?: string | null; addonNames: string[]; qty: number; notes: string }[]
) {
  const menuItemIds = [...new Set(rawItems.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, outletId, available: true },
    include: { variants: true, addons: true },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  let amount = 0;
  const items = rawItems.map((raw) => {
    const menuItem = byId.get(raw.menuItemId);
    if (!menuItem) throw new PublicOrderPricingError("One of the items in your order is no longer available");

    let basePrice = menuItem.price;
    let variantLabel = "";
    if (raw.variantName) {
      const variant = menuItem.variants.find((v) => v.name === raw.variantName);
      if (!variant) throw new PublicOrderPricingError(`"${raw.variantName}" is not a valid option for ${menuItem.name}`);
      basePrice = variant.price;
      variantLabel = ` (${variant.name})`;
    }

    const addonNames = [...new Set(raw.addonNames)];
    const addonsTotal = addonNames.reduce((sum, name) => {
      const addon = menuItem.addons.find((a) => a.name === name);
      if (!addon) throw new PublicOrderPricingError(`"${name}" is not a valid add-on for ${menuItem.name}`);
      return sum + addon.price;
    }, 0);
    const addonLabel = addonNames.length ? ` (+${addonNames.join(", ")})` : "";

    const unitPrice = basePrice + addonsTotal;
    amount += unitPrice * raw.qty;

    return { menuItemId: menuItem.id, name: `${menuItem.name}${variantLabel}${addonLabel}`, qty: raw.qty, unitPrice, notes: raw.notes };
  });

  return { items, amount };
}

// Wraps pricePublicOrderItems so both order-placement routes below share one
// error-to-response translation instead of repeating the same try/catch.
// Returns null (after already sending the 400) when pricing failed.
async function priceOrRespondBadRequest(
  res: Response,
  outletId: string,
  rawItems: Parameters<typeof pricePublicOrderItems>[1]
) {
  try {
    return await pricePublicOrderItems(outletId, rawItems);
  } catch (err) {
    if (err instanceof PublicOrderPricingError) {
      res.status(400).json({ error: err.message });
      return null;
    }
    throw err;
  }
}

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
    social: restaurant.social ?? {},
    categories: categories.map((c) => c.name),
    items,
  });
});

const publicMenuOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Enter your name"),
  customerPhone: z.string().trim().min(7, "Enter a valid phone number"),
  notes: z.string().default(""),
  items: z.array(orderItemSchema).min(1),
});

publicRouter.post("/menu/:slug/orders", async (req, res) => {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const outlet = await prisma.outlet.findFirst({ where: { tenantId: tenant.id }, orderBy: { isDefault: "desc" } });
  if (!outlet) return res.status(404).json({ error: "Not found" });

  const parsed = publicMenuOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const { items: rawItems, customerPhone, ...rest } = parsed.data;

  const priced = await priceOrRespondBadRequest(res, outlet.id, rawItems);
  if (!priced) return;
  const { items, amount } = priced;

  let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { tenantId: tenant.id, name: rest.customerName, phone: customerPhone } });
  }

  const order = await createOrderWithNumber(
    tenant.id,
    { ...rest, amount, orderType: "takeaway", outletId: outlet.id, source: "customer", customerId: customer.id },
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
});

publicRouter.post("/:tenantId/orders", async (req, res) => {
  const { tenantId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") return res.status(404).json({ error: "Not found" });

  const parsed = publicOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const table = await prisma.table.findFirst({ where: { id: parsed.data.tableId, tenantId } });
  if (!table) return res.status(404).json({ error: "Table not found" });

  const { items: rawItems, tableId, customerPhone, ...rest } = parsed.data;

  const priced = await priceOrRespondBadRequest(res, table.outletId, rawItems);
  if (!priced) return;
  const { items, amount } = priced;

  // Same phone ordering again (a repeat visit, or a second round at the
  // same table) reuses their existing profile instead of creating
  // duplicates — this is also what feeds the Customers list for marketing.
  let customer = await prisma.customer.findFirst({ where: { tenantId, phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { tenantId, name: rest.customerName, phone: customerPhone } });
  }

  const order = await createOrderWithNumber(
    tenantId,
    { ...rest, amount, orderType: "dine_in", tableId, outletId: table.outletId, source: "customer", customerId: customer.id },
    items
  );
  await deductStockForOrder(tenantId, order.orderNumber, items);
  await prisma.kitchenTicket.create({ data: { tenantId, orderId: order.id, orderNumber: order.orderNumber } });
  notifyOutlet(table.outletId, "orders:changed");
  notifyOutlet(table.outletId, "kitchen:changed");
  await occupyTable(tableId, table.status);

  res.status(201).json({ orderNumber: order.orderNumber });
});
