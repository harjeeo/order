import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant } from "../middleware/auth";

export const printLogRouter = Router();
printLogRouter.use(requireAuth, requireTenant);

const logSchema = z.object({
  type: z.enum(["kot", "invoice"]),
  action: z.enum(["print", "reprint", "download"]),
  refId: z.string().min(1),
});

// Real record behind the "Print KOT" / "Print Invoice" / "Reprint" /
// "Download Invoice" buttons, so there's an actual audit trail of what was
// printed, when, and by which tenant — not just a client-side action.
printLogRouter.post("/", async (req, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const log = await prisma.printLog.create({
    data: { tenantId: req.user!.tenantId!, ...parsed.data },
  });
  res.status(201).json({ ok: true, id: log.id });
});

printLogRouter.get("/", async (req, res) => {
  const logs = await prisma.printLog.findMany({
    where: { tenantId: req.user!.tenantId! },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(logs);
});
