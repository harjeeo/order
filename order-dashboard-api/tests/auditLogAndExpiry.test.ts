import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-audit-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return { email, token: loginRes.body.token as string };
}

describe("Super Admin audit trail", () => {
  let superAdminToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const admin = await createSuperAdmin();
    superAdminToken = admin.token;

    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const res = await request(app)
      .post("/api/tenants")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: `Audit Test Cafe ${suffix}`, ownerName: "Audit Owner", email: `audit-owner-${suffix}@example.test`, plan: "Free" });
    tenantId = res.body.id;
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("records a tenant.create entry with the acting Super Admin", async () => {
    const res = await request(app).get("/api/tenants/audit-log").set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    const createEntry = res.body.items.find((e: any) => e.action === "tenant.create" && e.targetId === tenantId);
    expect(createEntry).toBeDefined();
    expect(createEntry.actorRole).toBe("SUPER_ADMIN");
  });

  it("records a tenant.suspend entry when toggling status", async () => {
    await request(app).post(`/api/tenants/${tenantId}/toggle-status`).set("Authorization", `Bearer ${superAdminToken}`);

    const res = await request(app).get("/api/tenants/audit-log").set("Authorization", `Bearer ${superAdminToken}`);
    const suspendEntry = res.body.items.find((e: any) => e.action === "tenant.suspend" && e.targetId === tenantId);
    expect(suspendEntry).toBeDefined();

    // put it back for the next test
    await request(app).post(`/api/tenants/${tenantId}/toggle-status`).set("Authorization", `Bearer ${superAdminToken}`);
  });

  it("requires Super Admin auth to read the audit log", async () => {
    const res = await request(app).get("/api/tenants/audit-log");
    expect(res.status).toBe(401);
  });

  it("supports pagination", async () => {
    const res = await request(app)
      .get("/api/tenants/audit-log")
      .query({ page: 1, pageSize: 2 })
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body.pageSize).toBe(2);
  });
});

describe("tenant suspension and plan-expiry enforcement at login", () => {
  let superAdminToken: string;
  let tenantId: string;
  let staffEmail: string;
  let staffPassword: string;

  beforeAll(async () => {
    const admin = await createSuperAdmin();
    superAdminToken = admin.token;

    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    staffEmail = `expiry-staff-${suffix}@example.test`;
    const res = await request(app)
      .post("/api/tenants")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: `Expiry Test Cafe ${suffix}`, ownerName: "Expiry Owner", email: staffEmail, plan: "Free" });
    tenantId = res.body.id;
    staffPassword = res.body.staffLogin.tempPassword;
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("blocks login for a manually suspended tenant", async () => {
    await request(app).post(`/api/tenants/${tenantId}/toggle-status`).set("Authorization", `Bearer ${superAdminToken}`);

    const res = await request(app).post("/api/auth/login").send({ email: staffEmail, password: staffPassword });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/suspended/i);

    await request(app).post(`/api/tenants/${tenantId}/toggle-status`).set("Authorization", `Bearer ${superAdminToken}`);
  });

  it("auto-suspends and blocks login once planExpiry has passed, and records it in the audit log", async () => {
    await prisma.tenant.update({ where: { id: tenantId }, data: { planExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

    const res = await request(app).post("/api/auth/login").send({ email: staffEmail, password: staffPassword });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/plan has expired/i);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("suspended");

    const logRes = await request(app).get("/api/tenants/audit-log").set("Authorization", `Bearer ${superAdminToken}`);
    const expiryEntry = logRes.body.items.find((e: any) => e.action === "tenant.auto_suspend_expired" && e.targetId === tenantId);
    expect(expiryEntry).toBeDefined();
    expect(expiryEntry.actorEmail).toBe("system");
  });
});
