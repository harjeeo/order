import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const tenantsRouter = Router();
tenantsRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

tenantsRouter.get("/", async (req, res) => {
  const { search = "", status } = req.query as { search?: string; status?: string };
  const tenants = await prisma.tenant.findMany({
    where: {
      AND: [
        status ? { status: status as any } : {},
        search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { ownerName: { contains: search, mode: "insensitive" } }] }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  res.json(tenants);
});

const createTenantSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["Free", "Basic", "Pro"]).default("Free"),
});

tenantsRouter.post("/", async (req, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const tenant = await prisma.tenant.create({
    data: {
      ...parsed.data,
      planExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  // Give every new tenant an empty settings row and a starter table so the
  // Cafe dashboard isn't blank on first login.
  await prisma.settings.create({ data: { tenantId: tenant.id } });
  res.status(201).json(tenant);
});

tenantsRouter.patch("/:id", async (req, res) => {
  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: req.body });
  res.json(tenant);
});

tenantsRouter.post("/:id/toggle-status", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { status: tenant.status === "active" ? "suspended" : "active" },
  });
  res.json(updated);
});

tenantsRouter.delete("/:id", async (req, res) => {
  await prisma.tenant.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

tenantsRouter.get("/stats/summary", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({ include: { orders: true } });
  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;
  res.json({
    totalTenants: tenants.length,
    activeTenants: active,
    suspendedTenants: suspended,
  });
});
