import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireRole } from "../middleware/auth";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireTenant);

const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  ADMIN: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
  MANAGER: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: false },
  CASHIER: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  WAITER: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  KITCHEN_STAFF: { POS: false, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
};

staffRouter.get("/", async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { tenantId: req.user!.tenantId! },
    select: { id: true, name: true, email: true, role: true, phone: true, active: true, permissions: true },
  });
  res.json(staff);
});

// Only an ADMIN/MANAGER on the tenant (or a super admin impersonating
// support) can add staff and set a temporary password for them.
staffRouter.post("/", requireRole("ADMIN", "MANAGER", "SUPER_ADMIN"), async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const passwordHash = await bcrypt.hash(password ?? "changeme123", 10);
  const user = await prisma.user.create({
    data: {
      tenantId: req.user!.tenantId!,
      name,
      email,
      passwordHash,
      role,
      phone: phone ?? "",
      permissions: ROLE_DEFAULT_PERMISSIONS[role] ?? {},
    },
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

staffRouter.patch("/:id", async (req, res) => {
  const { password, ...rest } = req.body;
  const data: any = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

staffRouter.post("/:id/toggle-active", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { active: !user.active } });
  res.json({ id: updated.id, active: updated.active });
});

staffRouter.delete("/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
