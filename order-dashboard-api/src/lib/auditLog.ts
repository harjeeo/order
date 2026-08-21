import { prisma } from "../prisma";
import { AuthUser } from "../middleware/auth";
import { logger } from "./logger";

// Real record of Super Admin (or system) actions on tenants — who did
// what, to which tenant, when. Best-effort: a logging failure never
// blocks the actual action it's recording.
export async function logAudit(
  actor: AuthUser | null,
  action: string,
  targetType: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? "system",
        actorRole: actor?.role ?? "SYSTEM",
        action,
        targetType,
        targetId,
        meta: (meta ?? {}) as any,
      },
    });
  } catch (err) {
    logger.warn({ err, action, targetType, targetId }, "Failed to write audit log entry");
  }
}
