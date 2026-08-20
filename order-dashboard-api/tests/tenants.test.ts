import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" },
  });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return { email, token: loginRes.body.token as string };
}

describe("tenants: pagination, bulk actions, impersonation, export", () => {
  let token: string;
  let tenantIds: string[] = [];

  beforeAll(async () => {
    const admin = await createSuperAdmin();
    token = admin.token;

    for (let i = 0; i < 3; i++) {
      const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const res = await request(app)
        .post("/api/tenants")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: `Bulk Test Cafe ${i} ${suffix}`,
          ownerName: `Owner ${i}`,
          email: `owner-${suffix}@example.test`,
          plan: "Free",
        });
      tenantIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("paginates the tenants list", async () => {
    const res = await request(app)
      .get("/api/tenants")
      .query({ page: 1, pageSize: 2 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
  });

  it("bulk-suspends multiple tenants at once", async () => {
    const res = await request(app)
      .post("/api/tenants/bulk")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: tenantIds, action: "suspend" });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);

    const tenants = await prisma.tenant.findMany({ where: { id: { in: tenantIds } } });
    expect(tenants.every((t) => t.status === "suspended")).toBe(true);
  });

  it("bulk-changes plan for multiple tenants at once", async () => {
    const res = await request(app)
      .post("/api/tenants/bulk")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: tenantIds, action: "plan", plan: "Pro" });

    expect(res.status).toBe(200);
    const tenants = await prisma.tenant.findMany({ where: { id: { in: tenantIds } } });
    expect(tenants.every((t) => t.plan === "Pro")).toBe(true);
  });

  it("issues an impersonation token scoped to the tenant's admin", async () => {
    const res = await request(app)
      .post(`/api/tenants/${tenantIds[0]}/impersonate`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.tenantId).toBe(tenantIds[0]);
    expect(res.body.user.role).toBe("ADMIN");

    // The impersonation token should work against tenant-scoped routes.
    const ordersRes = await request(app).get("/api/orders").set("Authorization", `Bearer ${res.body.token}`);
    expect(ordersRes.status).toBe(200);
  });

  it("exports matching tenants as CSV", async () => {
    const res = await request(app)
      .get("/api/tenants/export")
      .query({ search: "Bulk Test Cafe" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\n")[0]).toContain("Name");
    expect(res.text).toContain("Bulk Test Cafe 0");
  });

  it("bulk-deletes multiple tenants at once", async () => {
    const res = await request(app)
      .post("/api/tenants/bulk")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: tenantIds, action: "delete" });

    expect(res.status).toBe(200);
    const remaining = await prisma.tenant.findMany({ where: { id: { in: tenantIds } } });
    expect(remaining).toHaveLength(0);
    tenantIds = [];
  });
});
