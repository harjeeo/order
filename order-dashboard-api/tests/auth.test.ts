import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("auth", () => {
  let tenantId: string;
  let email: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Auth Test Cafe");
    tenantId = t.tenant.id;
    email = t.email;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("logs in with correct credentials and returns a token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("rejects an incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("rejects an unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@nowhere.test", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("rejects malformed input", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects a request to a protected route with no token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });
});
