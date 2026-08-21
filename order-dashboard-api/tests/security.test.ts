import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

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
});
