import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const INSECURE_DEFAULT_JWT_SECRET = "dev-secret-change-in-production-please";

// Fail loudly instead of silently signing every token with a secret
// that's checked into git history — in production this must come from
// the environment. Dev/test keep the default so local setup stays
// zero-config.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable must be set in production. Refusing to start with the default dev secret.");
}
if (!process.env.JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not set — using the insecure default dev secret. Set JWT_SECRET before deploying.");
}

const JWT_SECRET = process.env.JWT_SECRET ?? INSECURE_DEFAULT_JWT_SECRET;

export interface AuthUser {
  id: string;
  role: Role;
  tenantId: string | null;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// Every tenant-scoped route requires a logged-in user with a tenantId
// (super admins have none, and only manage the /tenants routes).
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.tenantId) return res.status(403).json({ error: "No tenant on this account" });
  next();
}
