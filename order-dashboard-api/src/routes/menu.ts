import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";
import { validateImage } from "../lib/imageValidation";

export const menuRouter = Router();
menuRouter.use(requireAuth, requireTenant, requireOutlet);

menuRouter.get("/categories", async (req, res) => {
  const categories = await prisma.menuCategory.findMany({ where: { outletId: req.outletId! } });
  res.json(categories.map((c) => c.name));
});

menuRouter.post("/categories", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });
  const category = await prisma.menuCategory.upsert({
    where: { outletId_name: { outletId: req.outletId!, name } },
    update: {},
    create: { tenantId: req.user!.tenantId!, outletId: req.outletId!, name },
  });
  res.status(201).json(category);
});

menuRouter.delete("/categories/:name", async (req, res) => {
  const category = await prisma.menuCategory.findUnique({
    where: { outletId_name: { outletId: req.outletId!, name: req.params.name } },
  });
  if (!category) return res.json({ ok: true });

  const itemCount = await prisma.menuItem.count({ where: { categoryId: category.id } });
  if (itemCount > 0) {
    return res.status(409).json({ error: `Move or delete the ${itemCount} item(s) in this category first.` });
  }

  await prisma.menuCategory.delete({ where: { id: category.id } });
  res.json({ ok: true });
});

menuRouter.get("/items", async (req, res) => {
  const { category, search = "" } = req.query as { category?: string; search?: string };
  const items = await prisma.menuItem.findMany({
    where: {
      outletId: req.outletId!,
      name: { contains: search, mode: "insensitive" },
      ...(category && category !== "All" ? { category: { name: category } } : {}),
    },
    include: { category: true, variants: true, addons: true },
  });
  res.json(items);
});

const itemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  image: z.string().optional(),
  price: z.number().nonnegative(),
  tax: z.number().nonnegative().default(5),
  available: z.boolean().default(true),
  variants: z.array(z.object({ name: z.string(), price: z.number() })).default([]),
  addons: z.array(z.object({ name: z.string(), price: z.number() })).default([]),
});

menuRouter.post("/items", async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const imageError = validateImage(parsed.data.image);
  if (imageError) return res.status(400).json({ error: imageError });
  const { variants, addons, ...data } = parsed.data;

  const item = await prisma.menuItem.create({
    data: {
      ...data,
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
      variants: { create: variants },
      addons: { create: addons },
    },
    include: { variants: true, addons: true },
  });
  res.status(201).json(item);
});

menuRouter.patch("/items/:id", async (req, res) => {
  const { variants, addons, ...data } = req.body;
  if (typeof data.image === "string") {
    const imageError = validateImage(data.image);
    if (imageError) return res.status(400).json({ error: imageError });
  }
  if (variants) {
    await prisma.menuVariant.deleteMany({ where: { menuItemId: req.params.id } });
  }
  if (addons) {
    await prisma.menuAddon.deleteMany({ where: { menuItemId: req.params.id } });
  }
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(variants ? { variants: { create: variants } } : {}),
      ...(addons ? { addons: { create: addons } } : {}),
    },
    include: { variants: true, addons: true },
  });
  res.json(item);
});

menuRouter.post("/items/:id/toggle-availability", async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.menuItem.update({ where: { id: req.params.id }, data: { available: !item.available } });
  res.json(updated);
});

menuRouter.delete("/items/:id", async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
