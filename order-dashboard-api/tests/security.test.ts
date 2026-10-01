import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("security hardening", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("no longer exposes a public /api/auth/register endpoint", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Attacker",
      email: `attacker-${Date.now()}@example.test`,
      password: "password123",
      tenantId: "some-tenant-id",
      role: "ADMIN",
    });
    expect(res.status).toBe(404);
  });

  it("sets security headers via helmet", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });

  it("rejects staff creation without authentication", async () => {
    const res = await request(app).post("/api/staff").send({
      name: "No Auth Staff",
      email: `noauth-${Date.now()}@example.test`,
      password: "password123",
      role: "ADMIN",
    });
    expect(res.status).toBe(401);
  });

  describe("privilege escalation via /api/staff", () => {
    let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

    beforeAll(async () => {
      ctx = await createTenantWithAdmin("Staff Escalation");
    });

    afterAll(async () => {
      await deleteTenant(ctx.tenant.id);
    });

    it("blocks a tenant Admin from creating a platform Super Admin via POST /api/staff", async () => {
      const res = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${ctx.token}`)
        .send({ name: "Escalated", email: `escalate-${Date.now()}@example.test`, password: "password123", role: "SUPER_ADMIN" });

      expect(res.status).toBe(403);
      const escalated = await prisma.user.findFirst({ where: { tenantId: ctx.tenant.id, role: "SUPER_ADMIN" } });
      expect(escalated).toBeNull();
    });

    it("blocks granting Super Admin to an existing staff member via PATCH /api/staff/:id", async () => {
      const create = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${ctx.token}`)
        .send({ name: "Regular Staff", email: `regular-${Date.now()}@example.test`, password: "password123", role: "CASHIER" });
      expect(create.status).toBe(201);

      const patch = await request(app)
        .patch(`/api/staff/${create.body.id}`)
        .set("Authorization", `Bearer ${ctx.token}`)
        .send({ role: "SUPER_ADMIN" });

      expect(patch.status).toBe(403);
      const unchanged = await prisma.user.findUnique({ where: { id: create.body.id } });
      expect(unchanged?.role).toBe("CASHIER");
    });
  });
});
