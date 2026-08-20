import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

describe("platform reports: date range + growth trend + export", () => {
  let token: string;

  beforeAll(async () => {
    token = await createSuperAdmin();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("respects a custom expiring-plans window", async () => {
    const res = await request(app)
      .get("/api/platform-settings/reports")
      .query({ expiringDays: 7 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.expiringDays).toBe(7);
  });

  it("clamps an out-of-range expiringDays to the allowed bounds", async () => {
    const res = await request(app)
      .get("/api/platform-settings/reports")
      .query({ expiringDays: 99999 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.expiringDays).toBeLessThanOrEqual(365);
  });

  it("returns a monthly growth trend of the requested length", async () => {
    const res = await request(app)
      .get("/api/platform-settings/reports")
      .query({ months: 4 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.growthTrend).toHaveLength(4);
    expect(res.body.growthTrend[0]).toHaveProperty("month");
    expect(res.body.growthTrend[0]).toHaveProperty("newTenants");
    expect(res.body.growthTrend[0]).toHaveProperty("revenue");
  });

  it("exports the report as a multi-section CSV", async () => {
    const res = await request(app)
      .get("/api/platform-settings/reports/export")
      .query({ months: 3 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Revenue by Plan");
    expect(res.text).toContain("Monthly Growth");
  });
});
