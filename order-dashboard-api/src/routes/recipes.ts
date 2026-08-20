import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const recipesRouter = Router();
recipesRouter.use(requireAuth, requireTenant);

recipesRouter.get("/:menuItemId", async (req, res) => {
  const rows = await prisma.recipeIngredient.findMany({
    where: { tenantId: req.user!.tenantId!, menuItemId: req.params.menuItemId },
    include: { ingredient: true },
  });
  res.json(
    rows.map((r) => ({ id: r.id, ingredientId: r.ingredientId, ingredientName: r.ingredient.name, unit: r.ingredient.unit, qty: r.qty }))
  );
});

const saveRecipeSchema = z.object({
  ingredients: z.array(z.object({ ingredientId: z.string().min(1), qty: z.number().positive() })),
});

// Replaces the full ingredient list for a menu item in one call.
recipesRouter.put("/:menuItemId", async (req, res) => {
  const parsed = saveRecipeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const tenantId = req.user!.tenantId!;
  const { menuItemId } = req.params;

  const menuItem = await prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
  if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { tenantId, menuItemId } }),
    prisma.recipeIngredient.createMany({
      data: parsed.data.ingredients.map((i) => ({ tenantId, menuItemId, ingredientId: i.ingredientId, qty: i.qty })),
    }),
  ]);

  const rows = await prisma.recipeIngredient.findMany({ where: { tenantId, menuItemId }, include: { ingredient: true } });
  res.json(
    rows.map((r) => ({ id: r.id, ingredientId: r.ingredientId, ingredientName: r.ingredient.name, unit: r.ingredient.unit, qty: r.qty }))
  );
});
