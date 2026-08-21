import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireRole } from "../middleware/auth";

export const outletsRouter = Router();
outletsRouter.use(requireAuth, requireTenant);

outletsRouter.get("/", async (req, res) => {
  const outlets = await prisma.outlet.findMany({
    where: { tenantId: req.user!.tenantId! },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  res.json(outlets);
});

const createOutletSchema = z.object({
  name: z.string().min(1),
  address: z.string().default(""),
});

// Adding an outlet seeds it with its own empty menu category so the new
// branch isn't a dead end with no menu to add items to.
outletsRouter.post("/", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const parsed = createOutletSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const tenantId = req.user!.tenantId!;

  const outlet = await prisma.outlet.create({ data: { tenantId, ...parsed.data } });
  await prisma.menuCategory.create({ data: { tenantId, outletId: outlet.id, name: "General" } });
  res.status(201).json(outlet);
});

outletsRouter.patch("/:id", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const tenantId = req.user!.tenantId!;
  const existing = await prisma.outlet.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Outlet not found" });
  const { name, address } = req.body;
  const outlet = await prisma.outlet.update({
    where: { id: existing.id },
    data: { ...(name !== undefined ? { name } : {}), ...(address !== undefined ? { address } : {}) },
  });
  res.json(outlet);
});
