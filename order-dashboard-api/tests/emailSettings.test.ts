import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-email-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

describe("platform email settings", () => {
  let token: string;

  beforeAll(async () => {
    token = await createSuperAdmin();
  });

  afterAll(async () => {
    // Reset back to "none" so other test files see a clean default.
    await prisma.platformSettings.updateMany({
      data: { emailSettings: { provider: "none", fromName: "Order Dashboard", fromEmail: "", mailjet: { apiKey: "", apiSecret: "" }, brevo: { apiKey: "" } } },
    });
    await prisma.$disconnect();
  });

  it("saves and reads back a Mailjet configuration via the generic settings endpoint", async () => {
    const current = await request(app).get("/api/platform-settings").set("Authorization", `Bearer ${token}`);
    const patchRes = await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...current.body,
        emailSettings: {
          provider: "mailjet",
          fromName: "Test Cafe Platform",
          fromEmail: "noreply@example.test",
          mailjet: { apiKey: "fake-key", apiSecret: "fake-secret" },
          brevo: { apiKey: "" },
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.emailSettings.provider).toBe("mailjet");
    expect(patchRes.body.emailSettings.mailjet.apiKey).toBe("fake-key");

    const getRes = await request(app).get("/api/platform-settings").set("Authorization", `Bearer ${token}`);
    expect(getRes.body.emailSettings.provider).toBe("mailjet");
    expect(getRes.body.emailSettings.fromEmail).toBe("noreply@example.test");
  });

  it("returns a clear error from /email/test when no provider is configured", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailSettings: { provider: "none", fromName: "X", fromEmail: "", mailjet: { apiKey: "", apiSecret: "" }, brevo: { apiKey: "" } } });

    const res = await request(app)
      .post("/api/platform-settings/email/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "someone@example.test" });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no email provider configured/i);
  });

  it("rejects a malformed test-email address", async () => {
    const res = await request(app)
      .post("/api/platform-settings/email/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("surfaces a provider-specific error when Mailjet credentials are fake", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        emailSettings: {
          provider: "mailjet",
          fromName: "Test",
          fromEmail: "noreply@example.test",
          mailjet: { apiKey: "fake-key", apiSecret: "fake-secret" },
          brevo: { apiKey: "" },
        },
      });

    const res = await request(app)
      .post("/api/platform-settings/email/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "someone@example.test" });

    // Real Mailjet call with fake creds — expect it to fail cleanly with
    // a provider-attributed error rather than throwing.
    expect(res.status).toBe(422);
    expect(res.body.provider).toBe("mailjet");
    expect(res.body.error).toEqual(expect.any(String));
  }, 15000);

  it("requires authentication", async () => {
    const res = await request(app).post("/api/platform-settings/email/test").send({ to: "someone@example.test" });
    expect(res.status).toBe(401);
  });
});
