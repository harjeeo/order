import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticator } from "otplib";
import { prisma } from "../prisma";
import { requireAuth, signToken, signMfaToken, verifyMfaToken } from "../middleware/auth";
import { logAudit } from "../lib/auditLog";

export const authRouter = Router();

// Blunt brute-force protection: 10 attempts per IP per 15 minutes across
// login/signup/change-password. Doesn't block on successful requests.
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

  // Cafe staff logins (not Super Admin, who has no tenantId) are gated on
  // their tenant's status — this is what actually makes "Suspend Client"
  // in Super Admin block access, and where an expired plan gets enforced.
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (tenant) {
      const isExpired = tenant.status === "active" && tenant.planExpiry != null && tenant.planExpiry.getTime() < Date.now();
      if (isExpired) {
        await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "suspended" } });
        await logAudit(null, "tenant.auto_suspend_expired", "tenant", tenant.id, { planExpiry: tenant.planExpiry });
      }
      // tenant.status here is from the read above, before the update just
      // made — check isExpired too so the just-suspended case isn't missed.
      if (isExpired || tenant.status === "suspended") {
        return res.status(403).json({
          error: isExpired
            ? "Your plan has expired. Contact support to renew and regain access."
            : "This account has been suspended. Contact support for help.",
        });
      }
    }
  }

  if (user.twoFactorEnabled) {
    return res.json({ requires2FA: true, mfaToken: signMfaToken(user.id) });
  }

  const token = signToken({ id: user.id, role: user.role, tenantId: user.tenantId, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

const mfaLoginSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(6).max(6),
});

authRouter.post("/login/2fa", authLimiter, async (req, res) => {
  const parsed = mfaLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  let userId: string;
  try {
    userId = verifyMfaToken(parsed.data.mfaToken);
  } catch {
    return res.status(401).json({ error: "That verification session has expired. Log in again." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) return res.status(401).json({ error: "Invalid session" });

  if (!authenticator.check(parsed.data.code, user.twoFactorSecret)) {
    return res.status(401).json({ error: "Invalid verification code" });
  }

  const token = signToken({ id: user.id, role: user.role, tenantId: user.tenantId, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
});

// --- Two-factor authentication setup (requires an active session) --------

authRouter.post("/2fa/setup", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Generates a new secret and stores it, but twoFactorEnabled stays false
  // until /2fa/enable confirms the user actually scanned it correctly —
  // otherwise a user could lock themselves out with a secret they never
  // saved.
  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  const otpauthUrl = authenticator.keyuri(user.email, "Cafe POS", secret);
  res.json({ secret, otpauthUrl });
});

const twoFactorCodeSchema = z.object({ code: z.string().min(6).max(6) });

authRouter.post("/2fa/enable", requireAuth, async (req, res) => {
  const parsed = twoFactorCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter the 6-digit code from your authenticator app" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.twoFactorSecret) return res.status(400).json({ error: "Start setup first" });
  if (!authenticator.check(parsed.data.code, user.twoFactorSecret)) {
    return res.status(400).json({ error: "Invalid code" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  res.json({ ok: true });
});

authRouter.post("/2fa/disable", requireAuth, async (req, res) => {
  const parsed = twoFactorCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter the 6-digit code from your authenticator app" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ error: "2FA is not enabled" });
  if (!authenticator.check(parsed.data.code, user.twoFactorSecret)) {
    return res.status(400).json({ error: "Invalid code" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  res.json({ ok: true });
});

authRouter.get("/2fa/status", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ enabled: user?.twoFactorEnabled ?? false });
});

// Staff accounts under an existing tenant are created via the
// auth-gated POST /api/staff (ADMIN/MANAGER/SUPER_ADMIN only) — there is
// deliberately no public "register into any tenant" endpoint here.

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
  await prisma.outlet.create({ data: { tenantId: tenant.id, name: "Main Outlet", isDefault: true } });

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
