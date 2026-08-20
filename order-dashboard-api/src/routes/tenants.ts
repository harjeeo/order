import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

function generateTempPassword() {
  // 10 random chars, easy to read/type out loud to a client over the phone.
  return crypto.randomBytes(8).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
}

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
    include: {
      orders: { where: { status: { not: "cancelled" } }, select: { amount: true } },
      users: { select: { id: true } },
    },
  });
  res.json(
    tenants.map((t) => ({
      ...t,
      totalOrders: t.orders.length,
      totalRevenue: t.orders.reduce((s, o) => s + o.amount, 0),
      staffCount: t.users.length,
      orders: undefined,
      users: undefined,
    }))
  );
});

const createTenantSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email("A valid owner email is required so they can log in"),
  address: z.string().optional(),
  plan: z.enum(["Free", "Basic", "Pro"]).default("Free"),
});

tenantsRouter.post("/", async (req, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) return res.status(409).json({ error: "That email already has a login on this platform" });

  const tenant = await prisma.tenant.create({
    data: {
      ...parsed.data,
      planExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  // Give every new tenant an empty settings row so the Cafe dashboard
  // isn't blank on first login.
  await prisma.settings.create({ data: { tenantId: tenant.id } });

  // Every tenant needs at least one login to actually get into the Cafe
  // dashboard — create a starter Admin account with a one-time temp
  // password, returned once here for the Super Admin to hand to the client.
  const tempPassword = generateTempPassword();
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: parsed.data.ownerName,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: "ADMIN",
      permissions: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
    },
  });

  res.status(201).json({ ...tenant, staffLogin: { email: parsed.data.email, tempPassword } });
});

// Resets the tenant's original ADMIN login (the one created alongside the
// tenant) to a fresh temp password — for when a client is locked out.
tenantsRouter.post("/:id/reset-password", async (req, res) => {
  const admin = await prisma.user.findFirst({
    where: { tenantId: req.params.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) return res.status(404).json({ error: "No admin login found for this tenant" });

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(tempPassword, 10) },
  });

  res.json({ email: admin.email, tempPassword });
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
  const tenants = await prisma.tenant.findMany({
    include: { orders: { where: { status: { not: "cancelled" } }, select: { amount: true } } },
  });
  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;
  const platformRevenue = tenants.reduce((s, t) => s + t.orders.reduce((s2, o) => s2 + o.amount, 0), 0);

  const recentSignups = [4, 3, 2, 1, 0].map((n) => {
    const day = new Date();
    day.setDate(day.getDate() - n);
    const dateStr = day.toISOString().slice(0, 10);
    return {
      date: dateStr,
      count: tenants.filter((t) => t.createdAt.toISOString().slice(0, 10) === dateStr).length,
    };
  });

  res.json({
    totalTenants: tenants.length,
    activeTenants: active,
    suspendedTenants: suspended,
    platformRevenue,
    recentSignups,
  });
});
