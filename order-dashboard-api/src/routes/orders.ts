import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const ordersRouter = Router();
ordersRouter.use(requireAuth, requireTenant, requireOutlet);

ordersRouter.get("/", async (req, res) => {
  const { search = "", status, orderType } = req.query as { search?: string; status?: string; orderType?: string };
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const where = {
    outletId: req.outletId!,
    ...(status && status !== "all" ? { status: status as any } : {}),
    ...(orderType && orderType !== "all" ? { orderType: orderType as any } : {}),
    OR: [{ orderNumber: { contains: search, mode: "insensitive" as const } }, { customerName: { contains: search, mode: "insensitive" as const } }],
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().default(0),
  notes: z.string().default(""),
});

const createOrderSchema = z.object({
  orderType: z.enum(["dine_in", "takeaway", "delivery"]),
  tableId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().default("Walk-in Customer"),
  waiter: z.string().default(""),
  notes: z.string().default(""),
  items: z.array(orderItemSchema).min(1),
  amount: z.number().nonnegative(),
  action: z.enum(["save", "hold", "kitchen", "kot", "bill", "payment"]).default("save"),
});

// Order numbers are derived from the DB (not an in-memory counter, which
// would collide with existing rows after every server restart). A short
// retry loop handles the rare race between two orders in the same tenant.
export async function createOrderWithNumber(tenantId: string, data: any, items: any[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.order.count({ where: { tenantId } });
    const orderNumber = `ORD-${3001 + count + attempt}`;
    try {
      return await prisma.order.create({
        data: { ...data, tenantId, orderNumber, items: { create: items } },
        include: { items: true },
      });
    } catch (err: any) {
      if (err.code !== "P2002") throw err;
    }
  }
  throw new Error("Could not allocate an order number");
}

// Deducts ingredient stock for any order line linked to a recipe. Ingredient
// needs from multiple lines/items are aggregated first so a shared
// ingredient (e.g. milk in two drinks) is only fetched/updated once.
export async function deductStockForOrder(tenantId: string, orderNumber: string, items: { menuItemId?: string; qty: number }[]) {
  const menuItemIds = [...new Set(items.filter((i) => i.menuItemId).map((i) => i.menuItemId!))];
  if (menuItemIds.length === 0) return;

  const recipeRows = await prisma.recipeIngredient.findMany({ where: { tenantId, menuItemId: { in: menuItemIds } } });
  if (recipeRows.length === 0) return;

  const qtyByMenuItem = new Map<string, number>();
  for (const item of items) {
    if (!item.menuItemId) continue;
    qtyByMenuItem.set(item.menuItemId, (qtyByMenuItem.get(item.menuItemId) ?? 0) + item.qty);
  }

  const needed = new Map<string, number>();
  for (const recipe of recipeRows) {
    const orderedQty = qtyByMenuItem.get(recipe.menuItemId) ?? 0;
    if (orderedQty === 0) continue;
    needed.set(recipe.ingredientId, (needed.get(recipe.ingredientId) ?? 0) + recipe.qty * orderedQty);
  }

  for (const [ingredientId, qty] of needed) {
    const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
    if (!ingredient) continue;
    const newStock = Math.max(0, ingredient.stock - qty);
    await prisma.ingredient.update({ where: { id: ingredientId }, data: { stock: newStock } });
    await prisma.stockMovement.create({
      data: { tenantId, ingredientId, type: "out", qty, note: `Order ${orderNumber}` },
    });
  }
}

ordersRouter.post("/", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const { items, action, ...data } = parsed.data;
  const tenantId = req.user!.tenantId!;

  const order = await createOrderWithNumber(tenantId, { ...data, outletId: req.outletId! }, items);
  await deductStockForOrder(tenantId, order.orderNumber, items);

  if (action === "kitchen" || action === "kot") {
    await prisma.kitchenTicket.create({
      data: { tenantId, orderId: order.id, orderNumber: order.orderNumber },
    });
  }
  if (data.tableId) {
    await prisma.table.update({ where: { id: data.tableId }, data: { status: "occupied" } });
  }

  res.status(201).json(order);
});

ordersRouter.patch("/:id/status", async (req, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json(order);
});

ordersRouter.patch("/:id", async (req, res) => {
  const { items, ...data } = req.body;
  if (items) {
    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
  }
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { ...data, ...(items ? { items: { create: items } } : {}) },
    include: { items: true },
  });
  res.json(order);
});

ordersRouter.post("/:id/cancel", async (req, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { status: "cancelled" } });
  res.json(order);
});

ordersRouter.post("/:id/refund", async (req, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { paymentStatus: "refunded" } });
  res.json(order);
});
