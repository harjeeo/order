import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole, signToken } from "../middleware/auth";
import { sendEmail, credentialsEmailHtml } from "../lib/email";
import { logAudit } from "../lib/auditLog";

function generateTempPassword() {
  // 10 random chars, easy to read/type out loud to a client over the phone.
  return crypto.randomBytes(8).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
}

export const tenantsRouter = Router();
tenantsRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

function tenantWhere(search: string, status?: string) {
  return {
    AND: [
      status && status !== "all" ? { status: status as any } : {},
      search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { ownerName: { contains: search, mode: "insensitive" as const } }] }
        : {},
    ],
  };
}

function withComputedFields(t: any) {
  return {
    ...t,
    totalOrders: t.orders.length,
    totalRevenue: t.orders.reduce((s: number, o: { amount: number }) => s + o.amount, 0),
    staffCount: t.users.length,
    orders: undefined,
    users: undefined,
  };
}

tenantsRouter.get("/", async (req, res) => {
  const { search = "", status } = req.query as { search?: string; status?: string };
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const where = tenantWhere(search, status);

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        orders: { where: { status: { not: "cancelled" } }, select: { amount: true } },
        users: { select: { id: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  res.json({ items: tenants.map(withComputedFields), total, page, pageSize });
});

// Exports every tenant matching the current filters (not just the current
// page) as CSV — used by the "Export CSV" button on the Tenants list.
tenantsRouter.get("/export", async (req, res) => {
  const { search = "", status } = req.query as { search?: string; status?: string };
  const tenants = await prisma.tenant.findMany({
    where: tenantWhere(search, status),
    orderBy: { createdAt: "desc" },
    include: {
      orders: { where: { status: { not: "cancelled" } }, select: { amount: true } },
      users: { select: { id: true } },
    },
  });

  const rows = tenants.map(withComputedFields);
  const header = ["Name", "Owner", "Email", "Phone", "Plan", "Status", "Total Orders", "Total Revenue", "Staff", "Created At"];
  const csvEscape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((t) =>
      [t.name, t.ownerName, t.email, t.phone, t.plan, t.status, t.totalOrders, t.totalRevenue, t.staffCount, t.createdAt.toISOString()]
        .map(csvEscape)
        .join(",")
    ),
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="tenants-${Date.now()}.csv"`);
  res.send(lines.join("\n"));
});

const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["suspend", "activate", "delete", "plan"]),
  plan: z.enum(["Free", "Basic", "Pro"]).optional(),
});

// Applies one action to many tenants at once (row-selection bulk actions
// on the Tenants list: suspend / activate / delete / change plan).
tenantsRouter.post("/bulk", async (req, res) => {
  const parsed = bulkActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const { ids, action, plan } = parsed.data;

  if (action === "delete") {
    await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
  } else if (action === "suspend") {
    await prisma.tenant.updateMany({ where: { id: { in: ids } }, data: { status: "suspended" } });
  } else if (action === "activate") {
    await prisma.tenant.updateMany({ where: { id: { in: ids } }, data: { status: "active" } });
  } else if (action === "plan") {
    if (!plan) return res.status(400).json({ error: "A plan is required for the plan action" });
    await prisma.tenant.updateMany({ where: { id: { in: ids } }, data: { plan } });
  }

  await logAudit(req.user!, `tenant.bulk_${action}`, "tenant", undefined, { ids, plan });
  res.json({ ok: true, count: ids.length });
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
  await prisma.outlet.create({ data: { tenantId: tenant.id, name: "Main Outlet", isDefault: true } });

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

  // Best-effort: if an email provider is configured, send the credentials
  // straight to the owner instead of making the Super Admin copy/paste
  // them manually. Never blocks tenant creation on email failure.
  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject: `Your ${parsed.data.name} login is ready`,
    html: credentialsEmailHtml({
      cafeName: parsed.data.name,
      loginPath: "/login/cafe",
      email: parsed.data.email,
      tempPassword,
    }),
  });

  await logAudit(req.user!, "tenant.create", "tenant", tenant.id, { name: tenant.name, plan: tenant.plan });

  res.status(201).json({
    ...tenant,
    staffLogin: { email: parsed.data.email, tempPassword },
    emailSent: emailResult.ok,
  });
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

  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  const emailResult = await sendEmail({
    to: admin.email,
    subject: `Your ${tenant?.name ?? "cafe"} login was reset`,
    html: credentialsEmailHtml({
      cafeName: tenant?.name ?? "your cafe",
      loginPath: "/login/cafe",
      email: admin.email,
      tempPassword,
    }),
  });

  await logAudit(req.user!, "tenant.reset_password", "tenant", req.params.id, { adminEmail: admin.email });

  res.json({ email: admin.email, tempPassword, emailSent: emailResult.ok });
});

// Issues a token for the tenant's ADMIN login so the Super Admin can view
// the Cafe dashboard exactly as that client sees it, for support. The
// frontend keeps the Super Admin's own session aside so it can restore it
// when the Super Admin exits impersonation.
tenantsRouter.post("/:id/impersonate", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const admin = await prisma.user.findFirst({
    where: { tenantId: req.params.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) return res.status(404).json({ error: "No admin login found for this tenant" });

  const token = signToken({ id: admin.id, role: admin.role, tenantId: admin.tenantId, email: admin.email });
  await logAudit(req.user!, "tenant.impersonate", "tenant", req.params.id, { asUserEmail: admin.email });
  res.json({
    token,
    user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, tenantId: admin.tenantId },
  });
});

tenantsRouter.patch("/:id", async (req, res) => {
  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: req.body });
  await logAudit(req.user!, "tenant.update", "tenant", req.params.id, req.body);
  res.json(tenant);
});

tenantsRouter.post("/:id/toggle-status", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).json({ error: "Not found" });
  const newStatus = tenant.status === "active" ? "suspended" : "active";
  const updated = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { status: newStatus },
  });
  await logAudit(req.user!, `tenant.${newStatus === "suspended" ? "suspend" : "activate"}`, "tenant", req.params.id);
  res.json(updated);
});

tenantsRouter.delete("/:id", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  await prisma.tenant.delete({ where: { id: req.params.id } });
  await logAudit(req.user!, "tenant.delete", "tenant", req.params.id, { name: tenant?.name });
  res.json({ ok: true });
});

tenantsRouter.get("/audit-log", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30));

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count(),
  ]);

  res.json({ items, total, page, pageSize });
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
