import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { PLATFORM_SETTINGS_SINGLETON_ID } from "../src/lib/platformSettingsId";

// PlatformSettings is a singleton keyed by a fixed id (see
// platformSettingsId.ts) — tests must upsert that same row rather than
// deleteMany+create with a random id, or the app's findUnique-by-id reads
// will simply miss it.
async function setAllowSelfSignup(allowSelfSignup: boolean) {
  await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_SINGLETON_ID },
    update: { allowSelfSignup },
    create: { id: PLATFORM_SETTINGS_SINGLETON_ID, allowSelfSignup },
  });
}

describe("public self sign-up", () => {
  const createdTenantIds: string[] = [];

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } }).catch(() => {});
    await setAllowSelfSignup(true);
    await prisma.$disconnect();
  });

  it("creates a tenant + admin login and returns a token when self sign-up is allowed", async () => {
    await setAllowSelfSignup(true);

    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const res = await request(app).post("/api/auth/signup").send({
      cafeName: `Signup Test Cafe ${suffix}`,
      ownerName: "Signup Owner",
      email: `signup-${suffix}@example.test`,
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.role).toBe("ADMIN");
    createdTenantIds.push(res.body.user.tenantId);

    const tenant = await prisma.tenant.findUnique({ where: { id: res.body.user.tenantId } });
    expect(tenant).not.toBeNull();
    expect(tenant?.name).toContain("Signup Test Cafe");

    // The new login actually works.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: `signup-${suffix}@example.test`, password: "password123" });
    expect(loginRes.status).toBe(200);
  });

  it("rejects sign-up with a 403 when self sign-up is disabled", async () => {
    await setAllowSelfSignup(false);

    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const res = await request(app).post("/api/auth/signup").send({
      cafeName: `Blocked Cafe ${suffix}`,
      ownerName: "Blocked Owner",
      email: `blocked-${suffix}@example.test`,
      password: "password123",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled/i);
  });

  it("rejects a duplicate email", async () => {
    await setAllowSelfSignup(true);

    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const email = `dup-${suffix}@example.test`;
    const payload = { cafeName: "Dup Cafe", ownerName: "Dup Owner", email, password: "password123" };

    const first = await request(app).post("/api/auth/signup").send(payload);
    expect(first.status).toBe(201);
    createdTenantIds.push(first.body.user.tenantId);

    const second = await request(app).post("/api/auth/signup").send({ ...payload, cafeName: "Dup Cafe 2" });
    expect(second.status).toBe(409);
  });
});
