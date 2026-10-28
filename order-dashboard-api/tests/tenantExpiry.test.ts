import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-expiry-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

// Regression coverage for a real production bug: a Super Admin clicking
// "Activate Client" on a tenant whose plan had actually expired (not just
// been manually suspended) only flipped `status` back to "active" without
// touching the stale `planExpiry` — so the very next staff login re-ran
// the expiry check in auth.ts, found the same past date, and immediately
// auto-suspended the tenant again. From the Super Admin's side this looked
// like Activate silently "not working" / an infinite suspend loop.
describe("tenant plan-expiry auto-suspend and reactivation", () => {
  let superToken: string;

  beforeAll(async () => {
    superToken = await createSuperAdmin();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("auto-suspends on login once planExpiry has passed, with a clear error", async () => {
    const ctx = await createTenantWithAdmin("Expiry Test Cafe");
    await prisma.tenant.update({ where: { id: ctx.tenant.id }, data: { planExpiry: new Date(Date.now() - 1000) } });

    const res = await request(app).post("/api/auth/login").send({ email: ctx.email, password: "password123" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/plan has expired/i);

    const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenant.id } });
    expect(tenant?.status).toBe("suspended");

    await deleteTenant(ctx.tenant.id);
  });

  it("reactivating an expired tenant renews planExpiry so login actually works afterward", async () => {
    const ctx = await createTenantWithAdmin("Expiry Reactivate Cafe");
    await prisma.tenant.update({
      where: { id: ctx.tenant.id },
      data: { planExpiry: new Date(Date.now() - 1000), status: "suspended" },
    });

    // Super Admin clicks "Activate Client".
    const toggleRes = await request(app)
      .post(`/api/tenants/${ctx.tenant.id}/toggle-status`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.status).toBe("active");
    expect(new Date(toggleRes.body.planExpiry).getTime()).toBeGreaterThan(Date.now());

    // The actual regression: login must now succeed, not immediately
    // re-suspend on the stale old expiry date.
    const loginRes = await request(app).post("/api/auth/login").send({ email: ctx.email, password: "password123" });
    expect(loginRes.status).toBe(200);

    const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenant.id } });
    expect(tenant?.status).toBe("active");

    await deleteTenant(ctx.tenant.id);
  });

  it("toggling a manually-suspended (not expired) tenant back to active leaves planExpiry untouched", async () => {
    const ctx = await createTenantWithAdmin("Manual Suspend Cafe");
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.tenant.update({ where: { id: ctx.tenant.id }, data: { planExpiry: farFuture, status: "suspended" } });

    const toggleRes = await request(app)
      .post(`/api/tenants/${ctx.tenant.id}/toggle-status`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.status).toBe("active");
    expect(new Date(toggleRes.body.planExpiry).getTime()).toBe(farFuture.getTime());

    await deleteTenant(ctx.tenant.id);
  });
});
