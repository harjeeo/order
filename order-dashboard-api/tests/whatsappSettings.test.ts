import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-whatsapp-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

const DEFAULT_WHATSAPP_SETTINGS = {
  enabled: false,
  phoneNumberId: "",
  accessToken: "",
  templateName: "bill_receipt",
  languageCode: "en",
  newOrderAlertsEnabled: false,
  newOrderTemplateName: "new_order_alert",
};

describe("platform WhatsApp bill-receipt settings", () => {
  let token: string;

  beforeAll(async () => {
    token = await createSuperAdmin();
  });

  afterAll(async () => {
    // Reset back to disabled so other test files see a clean default.
    await prisma.platformSettings.updateMany({ data: { whatsappSettings: DEFAULT_WHATSAPP_SETTINGS } });
    await prisma.$disconnect();
  });

  it("saves and reads back WhatsApp credentials via the generic settings endpoint", async () => {
    const patchRes = await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        whatsappSettings: {
          enabled: true,
          phoneNumberId: "123456",
          accessToken: "fake-token",
          templateName: "bill_receipt",
          languageCode: "en",
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.whatsappSettings.enabled).toBe(true);
    expect(patchRes.body.whatsappSettings.phoneNumberId).toBe("123456");

    const getRes = await request(app).get("/api/platform-settings").set("Authorization", `Bearer ${token}`);
    expect(getRes.body.whatsappSettings.phoneNumberId).toBe("123456");
  });

  it("returns a clear error from /whatsapp/test when disabled", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappSettings: DEFAULT_WHATSAPP_SETTINGS });

    const res = await request(app)
      .post("/api/platform-settings/whatsapp/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it("returns a clear error from /whatsapp/test when enabled but missing credentials", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappSettings: { ...DEFAULT_WHATSAPP_SETTINGS, enabled: true } });

    const res = await request(app)
      .post("/api/platform-settings/whatsapp/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/phone number id.*access token/i);
  });

  it("rejects a malformed test request", async () => {
    const res = await request(app)
      .post("/api/platform-settings/whatsapp/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "x" });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/platform-settings/whatsapp/test").send({ to: "9876543210" });
    expect(res.status).toBe(401);
  });

  it("returns a clear error from /whatsapp/test-new-order when disabled", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappSettings: DEFAULT_WHATSAPP_SETTINGS });

    const res = await request(app)
      .post("/api/platform-settings/whatsapp/test-new-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it("returns a clear error from /whatsapp/test-new-order when enabled but missing credentials", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappSettings: { ...DEFAULT_WHATSAPP_SETTINGS, newOrderAlertsEnabled: true } });

    const res = await request(app)
      .post("/api/platform-settings/whatsapp/test-new-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/phone number id.*access token/i);
  });

  it("the bill-receipt and new-order-alert toggles are independent of each other", async () => {
    await request(app)
      .patch("/api/platform-settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappSettings: { ...DEFAULT_WHATSAPP_SETTINGS, enabled: true, newOrderAlertsEnabled: false } });

    const billTest = await request(app)
      .post("/api/platform-settings/whatsapp/test")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });
    const newOrderTest = await request(app)
      .post("/api/platform-settings/whatsapp/test-new-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "9876543210" });

    // Bill receipts enabled -> fails on missing credentials, not "not enabled".
    expect(billTest.body.error).toMatch(/phone number id.*access token/i);
    // New-order alerts still disabled -> fails on "not enabled", confirming
    // the two toggles don't leak into each other.
    expect(newOrderTest.body.error).toMatch(/not enabled/i);
  });
});
