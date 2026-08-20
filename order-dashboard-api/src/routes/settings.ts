import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireTenant);

settingsRouter.get("/", async (req, res) => {
  const settings = await prisma.settings.upsert({
    where: { tenantId: req.user!.tenantId! },
    update: {},
    create: { tenantId: req.user!.tenantId! },
  });
  res.json(settings);
});

const SECTIONS = ["restaurant", "tax", "invoice", "kot", "printer", "paymentMethods"];

settingsRouter.patch("/:section", async (req, res) => {
  const { section } = req.params;
  if (!SECTIONS.includes(section)) return res.status(400).json({ error: "Unknown settings section" });

  const existing = await prisma.settings.upsert({
    where: { tenantId: req.user!.tenantId! },
    update: {},
    create: { tenantId: req.user!.tenantId! },
  });

  const merged = { ...((existing as any)[section] as object), ...req.body };
  const updated = await prisma.settings.update({
    where: { tenantId: req.user!.tenantId! },
    data: { [section]: merged },
  });
  res.json(updated);
});
