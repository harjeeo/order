import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, requireTenant);

function statusFor(stock: number, minimum: number) {
  if (stock <= 0) return "out";
  if (stock <= minimum) return "low";
  return "ok";
}

inventoryRouter.get("/ingredients", async (req, res) => {
  const ingredients = await prisma.ingredient.findMany({ where: { tenantId: req.user!.tenantId! } });
  res.json(ingredients.map((i) => ({ ...i, status: statusFor(i.stock, i.minimum) })));
});

inventoryRouter.post("/ingredients", async (req, res) => {
  const { name, unit, stock, minimum } = req.body;
  const ingredient = await prisma.ingredient.create({ data: { tenantId: req.user!.tenantId!, name, unit, stock, minimum } });
  res.status(201).json(ingredient);
});

inventoryRouter.post("/ingredients/:id/movements", async (req, res) => {
  const { type, note = "" } = req.body as { type: "in" | "out" | "adjustment" | "wastage"; note?: string };
  const qty = Number(req.body.qty) || 0;
  const ingredient = await prisma.ingredient.findUnique({ where: { id: req.params.id } });
  if (!ingredient) return res.status(404).json({ error: "Not found" });

  let newStock = ingredient.stock;
  if (type === "in") newStock += qty;
  else if (type === "out" || type === "wastage") newStock = Math.max(0, newStock - qty);
  else if (type === "adjustment") newStock = qty;

  const updated = await prisma.ingredient.update({ where: { id: req.params.id }, data: { stock: newStock } });
  await prisma.stockMovement.create({
    data: { tenantId: req.user!.tenantId!, ingredientId: req.params.id, type, qty, note },
  });

  res.json({ ...updated, status: statusFor(updated.stock, updated.minimum) });
});

inventoryRouter.get("/movements", async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { tenantId: req.user!.tenantId! },
    include: { ingredient: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(movements);
});
