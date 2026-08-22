import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireRole } from "../middleware/auth";

export const couponsRouter = Router();
couponsRouter.use(requireAuth, requireTenant);

couponsRouter.get("/", async (req, res) => {
  const coupons = await prisma.coupon.findMany({
    where: { tenantId: req.user!.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(coupons);
});

const createCouponSchema = z.object({
  code: z.string().trim().min(1).max(30),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

couponsRouter.post("/", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const parsed = createCouponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  if (parsed.data.type === "percent" && parsed.data.value > 100) {
    return res.status(400).json({ error: "Percent value can't exceed 100" });
  }

  const tenantId = req.user!.tenantId!;
  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { tenantId_code: { tenantId, code } } });
  if (existing) return res.status(409).json({ error: "A coupon with that code already exists" });

  const coupon = await prisma.coupon.create({
    data: {
      tenantId,
      code,
      type: parsed.data.type,
      value: parsed.data.value,
      maxUses: parsed.data.maxUses ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  res.status(201).json(coupon);
});

couponsRouter.patch("/:id", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const existing = await prisma.coupon.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Coupon not found" });
  const coupon = await prisma.coupon.update({
    where: { id: existing.id },
    data: { active: req.body.active },
  });
  res.json(coupon);
});

function couponError(coupon: { active: boolean; expiresAt: Date | null; maxUses: number | null; usedCount: number } | null): string | null {
  if (!coupon) return "Invalid coupon code";
  if (!coupon.active) return "This coupon is no longer active";
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return "This coupon has expired";
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return "This coupon has reached its usage limit";
  return null;
}

// Preview-only check the Billing page calls before payment — validates the
// code and returns the discount config so the client can show the amount.
// Actual redemption (usedCount increment) happens at payment time in
// billing.ts, re-checked there so two staff can't double-spend a
// maxUses:1 coupon in a race.
couponsRouter.post("/validate", async (req, res) => {
  const code = String(req.body.code ?? "").trim().toUpperCase();
  const subtotal = Number(req.body.subtotal) || 0;
  const tenantId = req.user!.tenantId!;

  const coupon = await prisma.coupon.findUnique({ where: { tenantId_code: { tenantId, code } } });
  const error = couponError(coupon);
  if (error) return res.status(400).json({ error });

  const discountAmount = coupon!.type === "percent" ? Math.round((subtotal * coupon!.value) / 100) : Math.min(coupon!.value, subtotal);
  res.json({ code: coupon!.code, type: coupon!.type, value: coupon!.value, discountAmount });
});

export { couponError };
