import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateImage } from "../lib/imageValidation";

export const menuIconsRouter = Router();
// Any logged-in user (Super Admin or Cafe staff) can read the library so
// the item-image picker can search it — only Super Admin can add/remove.
menuIconsRouter.use(requireAuth);

menuIconsRouter.get("/", async (req, res) => {
  const { search = "" } = req.query as { search?: string };
  const icons = await prisma.menuIcon.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
  });
  res.json(icons);
});

const createIconSchema = z.object({
  name: z.string().trim().min(1).max(60),
  image: z.string(),
});

menuIconsRouter.post("/", requireRole("SUPER_ADMIN"), async (req, res) => {
  const parsed = createIconSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  // SVGs are only ever rendered via <img src="data:...">, never inlined
  // as raw markup — that sandboxes any embedded script, so it's safe to
  // allow here even though regular menu-item photo uploads don't.
  const imageError = validateImage(parsed.data.image, { required: true, allowSvg: true });
  if (imageError) return res.status(400).json({ error: imageError });

  const icon = await prisma.menuIcon.create({ data: parsed.data });
  res.status(201).json(icon);
});

menuIconsRouter.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  await prisma.menuIcon.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});
