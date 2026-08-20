import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, signToken } from "../middleware/auth";

export const authRouter = Router();

// Blunt brute-force protection: 10 attempts per IP per 15 minutes across
// login/register/change-password. Doesn't block on successful requests.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, role: user.role, tenantId: user.tenantId, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN_STAFF"]).default("WAITER"),
});

// Creates a staff account under an existing tenant. Super admin account
// creation happens via the seed script, not a public endpoint.
authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const { name, email, password, tenantId, role } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, tenantId, role },
  });

  const token = signToken({ id: user.id, role: user.role, tenantId: user.tenantId, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

const signupSchema = z.object({
  cafeName: z.string().min(1),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

// Public self sign-up: a cafe owner creates their own tenant + admin
// login, gated by PlatformSettings.allowSelfSignup (Super Admin > Settings).
// Mirrors the tenant + starter-admin creation in tenants.ts, except the
// owner picks their own password instead of getting a temp one.
authRouter.post("/signup", authLimiter, async (req, res) => {
  const settings = await prisma.platformSettings.findFirst();
  if (settings && !settings.allowSelfSignup) {
    return res.status(403).json({ error: "Self sign-up is currently disabled. Contact us to get started." });
  }

  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const { cafeName, ownerName, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "That email already has a login on this platform" });

  const trialDays = settings?.trialDays ?? 14;
  const tenant = await prisma.tenant.create({
    data: {
      name: cafeName,
      ownerName,
      email,
      phone: phone ?? "",
      planExpiry: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.settings.create({ data: { tenantId: tenant.id } });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: ownerName,
      email,
      passwordHash,
      role: "ADMIN",
      permissions: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
    },
  });

  const token = signToken({ id: user.id, role: user.role, tenantId: user.tenantId, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

authRouter.post("/change-password", authLimiter, requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  res.json({ ok: true });
});
