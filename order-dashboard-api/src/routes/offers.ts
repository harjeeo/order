import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet, requireRole } from "../middleware/auth";

export const offersRouter = Router();
offersRouter.use(requireAuth, requireTenant, requireOutlet);

offersRouter.get("/", async (req, res) => {
  const offers = await prisma.offer.findMany({
    where: { tenantId: req.user!.tenantId!, outletId: req.outletId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(offers);
});

const offerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    type: z.enum(["bogo", "threshold_freebie", "combo"]),
    triggerCategory: z.string().min(1).nullable().optional(),
    triggerItemId: z.string().min(1).nullable().optional(),
    minTriggerPrice: z.number().nonnegative().nullable().optional(),
    buyQty: z.number().int().positive().nullable().optional(),
    freeQty: z.number().int().positive().nullable().optional(),
    freeItemId: z.string().min(1).nullable().optional(),
    comboItemIds: z.array(z.string().min(1)).nullable().optional(),
    comboPrice: z.number().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "bogo") {
      if (!data.triggerCategory && !data.triggerItemId) {
        ctx.addIssue({ code: "custom", message: "Pick a category or a specific item that triggers this offer" });
      }
      if (!data.buyQty || !data.freeQty) {
        ctx.addIssue({ code: "custom", message: "Buy quantity and free quantity are required" });
      }
    }
    if (data.type === "threshold_freebie") {
      if (!data.triggerCategory && !data.triggerItemId) {
        ctx.addIssue({ code: "custom", message: "Pick a category or a specific item that triggers this offer" });
      }
      if (!data.freeItemId) {
        ctx.addIssue({ code: "custom", message: "Pick the item given away free" });
      }
    }
    if (data.type === "combo") {
      if (!data.comboItemIds || data.comboItemIds.length < 2) {
        ctx.addIssue({ code: "custom", message: "A combo needs at least 2 items" });
      }
      if (data.comboPrice == null) {
        ctx.addIssue({ code: "custom", message: "Combo price is required" });
      }
    }
  });

// Prisma's nullable Json columns need Prisma.JsonNull (not plain `null`) to
// actually store SQL NULL rather than a JSON `null` literal.
function toOfferData(data: z.infer<typeof offerSchema>) {
  return { ...data, comboItemIds: data.comboItemIds ?? Prisma.JsonNull };
}

offersRouter.post("/", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const offer = await prisma.offer.create({
    data: {
      ...toOfferData(parsed.data),
      tenantId: req.user!.tenantId!,
      outletId: req.outletId!,
    },
  });
  res.status(201).json(offer);
});

offersRouter.patch("/:id", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const existing = await prisma.offer.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  if (!existing) return res.status(404).json({ error: "Offer not found" });

  if (typeof req.body.active === "boolean" && Object.keys(req.body).length === 1) {
    const offer = await prisma.offer.update({ where: { id: existing.id }, data: { active: req.body.active } });
    return res.json(offer);
  }

  const parsed = offerSchema.safeParse({ ...existing, ...req.body });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const offer = await prisma.offer.update({ where: { id: existing.id }, data: toOfferData(parsed.data) });
  res.json(offer);
});

offersRouter.delete("/:id", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  await prisma.offer.deleteMany({ where: { id: req.params.id, tenantId: req.user!.tenantId! } });
  res.json({ ok: true });
});
