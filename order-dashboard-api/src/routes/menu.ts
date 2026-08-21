import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const menuRouter = Router();
menuRouter.use(requireAuth, requireTenant, requireOutlet);

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB decoded
const ALLOWED_IMAGE_TYPES = ["png", "jpeg", "jpg", "webp", "gif"];

// Menu item "image" is either a plain emoji (left alone) or a data: URI
// photo upload — those get a real type + decoded-size check so a phone
// camera photo can't silently bloat the DB (base64 inflates size ~33%,
// so the check is against the decoded byte count, not the string length).
function validateImage(image: string | undefined): string | null {
  if (!image || !image.startsWith("data:image")) return null;
  const match = image.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "Invalid image format";
  const [, type, base64] = match;
  if (!ALLOWED_IMAGE_TYPES.includes(type.toLowerCase())) {
    return `Unsupported image type: ${type}. Use PNG, JPEG, WebP or GIF.`;
  }
  const byteSize = Math.ceil((base64.length * 3) / 4);
  if (byteSize > MAX_IMAGE_BYTES) {
    return `Image is too large (${(byteSize / (1024 * 1024)).toFixed(1)}MB) — must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`;
  }
  return null;
}

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
  await prisma.menuCategory.deleteMany({ where: { outletId: req.outletId!, name: req.params.name } });
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
