import request from "supertest";
import { authenticator } from "otplib";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("two-factor authentication", () => {
  let tenantId: string;
  let token: string;
  let email: string;
  const password = "password123";

  beforeAll(async () => {
    const t = await createTenantWithAdmin("2FA Test Cafe", password);
    tenantId = t.tenant.id;
    token = t.token;
    email = t.email;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("reports 2FA as disabled initially", async () => {
    const res = await request(app).get("/api/auth/2fa/status").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });

  it("rejects enabling with a wrong code", async () => {
    await request(app).post("/api/auth/2fa/setup").set("Authorization", `Bearer ${token}`);
    const res = await request(app).post("/api/auth/2fa/enable").set("Authorization", `Bearer ${token}`).send({ code: "000000" });
    expect(res.status).toBe(400);
  });

  it("sets up and enables 2FA with a valid code", async () => {
    const setupRes = await request(app).post("/api/auth/2fa/setup").set("Authorization", `Bearer ${token}`);
    expect(setupRes.status).toBe(200);
    expect(setupRes.body.secret).toBeTruthy();
    expect(setupRes.body.otpauthUrl).toMatch(/^otpauth:\/\//);

    const code = authenticator.generate(setupRes.body.secret);
    const enableRes = await request(app).post("/api/auth/2fa/enable").set("Authorization", `Bearer ${token}`).send({ code });
    expect(enableRes.status).toBe(200);

    const statusRes = await request(app).get("/api/auth/2fa/status").set("Authorization", `Bearer ${token}`);
    expect(statusRes.body.enabled).toBe(true);
  });

  it("login now requires 2FA instead of returning a full session token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.requires2FA).toBe(true);
    expect(res.body.mfaToken).toBeTruthy();
    expect(res.body.token).toBeUndefined();
  });

  it("the mfaToken cannot be used as a real session token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${loginRes.body.mfaToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects an invalid 2FA code at login", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const res = await request(app).post("/api/auth/login/2fa").send({ mfaToken: loginRes.body.mfaToken, code: "000000" });
    expect(res.status).toBe(401);
  });

  it("completes login with a valid 2FA code", async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const code = authenticator.generate(user!.twoFactorSecret!);
    const res = await request(app).post("/api/auth/login/2fa").send({ mfaToken: loginRes.body.mfaToken, code });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(meRes.status).toBe(200);
  });

  it("disables 2FA with a valid code, and login goes back to normal", async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const code = authenticator.generate(user!.twoFactorSecret!);
    const disableRes = await request(app).post("/api/auth/2fa/disable").set("Authorization", `Bearer ${token}`).send({ code });
    expect(disableRes.status).toBe(200);

    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    expect(loginRes.body.requires2FA).toBeUndefined();
    expect(loginRes.body.token).toBeTruthy();
  });
});
