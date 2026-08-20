import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("auth rate limiting", () => {
  let tenantId: string;
  let email: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Rate Limit Test Cafe");
    tenantId = t.tenant.id;
    email = t.email;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("blocks login attempts after the configured limit is exceeded", async () => {
    // createTenantWithAdmin already used one request; send enough more
    // wrong-password attempts to cross the 10-per-15-minutes limit.
    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/auth/login").send({ email, password: "wrong" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
