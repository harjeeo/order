import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, requireTenant, requireOutlet);

function statusFor(stock: number, minimum: number) {
  if (stock <= 0) return "out";
  if (stock <= minimum) return "low";
  return "ok";
}

inventoryRouter.get("/ingredients", async (req, res) => {
  const ingredients = await prisma.ingredient.findMany({ where: { outletId: req.outletId! } });
  res.json(ingredients.map((i) => ({ ...i, status: statusFor(i.stock, i.minimum) })));
});

inventoryRouter.post("/ingredients", async (req, res) => {
  const { name, unit, stock, minimum, category = "", favourite = false, active = true } = req.body;
  const ingredient = await prisma.ingredient.create({
    data: { tenantId: req.user!.tenantId!, outletId: req.outletId!, name, unit, stock, minimum, category, favourite, active },
  });
  res.status(201).json(ingredient);
});

inventoryRouter.patch("/ingredients/:id", async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const ingredient = await prisma.ingredient.findFirst({ where: { id: req.params.id, tenantId } });
  if (!ingredient) return res.status(404).json({ error: "Not found" });

  const { name, unit, minimum, category, favourite, active } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (unit !== undefined) data.unit = unit;
  if (minimum !== undefined) data.minimum = minimum;
  if (category !== undefined) data.category = category;
  if (favourite !== undefined) data.favourite = favourite;
  if (active !== undefined) data.active = active;

  const updated = await prisma.ingredient.update({ where: { id: ingredient.id }, data });
  res.json({ ...updated, status: statusFor(updated.stock, updated.minimum) });
});

inventoryRouter.post("/ingredients/:id/movements", async (req, res) => {
  const { type, note = "" } = req.body as { type: "in" | "out" | "adjustment" | "wastage"; note?: string };
  const qty = Number(req.body.qty) || 0;
  const tenantId = req.user!.tenantId!;
  const ingredient = await prisma.ingredient.findFirst({ where: { id: req.params.id, tenantId } });
  if (!ingredient) return res.status(404).json({ error: "Not found" });

  let newStock = ingredient.stock;
  if (type === "in") newStock += qty;
  else if (type === "out" || type === "wastage") newStock = Math.max(0, newStock - qty);
  else if (type === "adjustment") newStock = qty;

  const updated = await prisma.ingredient.update({ where: { id: ingredient.id }, data: { stock: newStock } });
  await prisma.stockMovement.create({
    data: { tenantId, ingredientId: ingredient.id, type, qty, note },
  });

  res.json({ ...updated, status: statusFor(updated.stock, updated.minimum) });
});

inventoryRouter.get("/movements", async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { tenantId: req.user!.tenantId!, ingredient: { outletId: req.outletId! } },
    include: { ingredient: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(movements);
});
