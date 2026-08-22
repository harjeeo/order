import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import type { AuthUser } from "./middleware/auth";

const INSECURE_DEFAULT_JWT_SECRET = "dev-secret-change-in-production-please";
const JWT_SECRET = process.env.JWT_SECRET ?? INSECURE_DEFAULT_JWT_SECRET;

let io: SocketIOServer | null = null;

function outletRoom(outletId: string) {
  return `outlet:${outletId}`;
}

// Live updates for Orders/Kitchen/the kitchen display — a client joins
// the room for whichever outlet it's currently viewing (the same outlet
// switch already used for REST calls) and gets a lightweight "something
// changed, go refetch" ping. Deliberately not pushing full order payloads
// over the socket — the REST endpoints remain the single source of truth
// for outlet-scoped, tenant-isolated data; the socket is just the nudge
// to refetch them instead of polling.
export function initSocket(server: HttpServer) {
  const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
  io = new SocketIOServer(server, {
    cors: { origin: corsOrigins ?? true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Not authenticated"));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser & { purpose?: string };
      if (payload.purpose === "mfa" || !payload.tenantId) return next(new Error("Not authenticated"));
      (socket.data as any).tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Mirrors requireOutlet's fallback exactly: a single-outlet tenant's
    // client never has anything in localStorage to send (the outlet
    // switcher only bothers once there's more than one to switch
    // between), so an empty/missing outletId here means "my tenant's
    // default outlet", not "join nothing".
    socket.on("join-outlet", async (outletId?: string) => {
      const tenantId = (socket.data as any).tenantId;
      const outlet =
        typeof outletId === "string" && outletId
          ? await prisma.outlet.findFirst({ where: { id: outletId, tenantId } })
          : await prisma.outlet.findFirst({ where: { tenantId }, orderBy: { isDefault: "desc" } });
      if (!outlet) return;
      socket.join(outletRoom(outlet.id));
    });
  });

  return io;
}

export function notifyOutlet(outletId: string, event: "orders:changed" | "kitchen:changed") {
  io?.to(outletRoom(outletId)).emit(event);
}
