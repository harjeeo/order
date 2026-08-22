import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("coupons / promo codes", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Coupons Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  async function createOrderPending() {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderType: "takeaway", items: [{ name: "Coffee", qty: 1, unitPrice: 200 }], amount: 200, action: "save" });
    return res.body.id;
  }

  it("creates a coupon, uppercasing the code", async () => {
    const res = await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "welcome10", type: "percent", value: 10 });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe("WELCOME10");
  });

  it("rejects a duplicate code for the same tenant", async () => {
    const res = await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "WELCOME10", type: "fixed", value: 50 });
    expect(res.status).toBe(409);
  });

  it("rejects a percent value over 100", async () => {
    const res = await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "TOOBIG", type: "percent", value: 150 });
    expect(res.status).toBe(400);
  });

  it("validates a coupon and computes the discount preview", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "welcome10", subtotal: 200 });
    expect(res.status).toBe(200);
    expect(res.body.discountAmount).toBe(20);
  });

  it("rejects an unknown coupon code", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "NOPE", subtotal: 200 });
    expect(res.status).toBe(400);
  });

  it("redeems the coupon at payment time and increments usedCount", async () => {
    const orderId = await createOrderPending();
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 200, discountAmount: 20, total: 189, couponCode: "welcome10", method: "cash" });
    expect(res.status).toBe(201);
    expect(res.body.couponCode).toBe("WELCOME10");

    const coupon = await prisma.coupon.findFirst({ where: { tenantId, code: "WELCOME10" } });
    expect(coupon?.usedCount).toBe(1);
  });

  it("enforces maxUses — a single-use coupon can't be redeemed twice", async () => {
    await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "ONEUSE", type: "fixed", value: 30, maxUses: 1 });

    const orderId1 = await createOrderPending();
    const first = await request(app)
      .post(`/api/billing/orders/${orderId1}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 200, discountAmount: 30, total: 170, couponCode: "ONEUSE", method: "cash" });
    expect(first.status).toBe(201);

    const orderId2 = await createOrderPending();
    const second = await request(app)
      .post(`/api/billing/orders/${orderId2}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 200, discountAmount: 30, total: 170, couponCode: "ONEUSE", method: "cash" });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/usage limit/i);
  });

  it("rejects an expired coupon", async () => {
    await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "EXPIRED", type: "percent", value: 10, expiresAt: new Date(Date.now() - 86400000).toISOString() });

    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "EXPIRED", subtotal: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("deactivating a coupon blocks new redemptions", async () => {
    const createRes = await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "TOGGLE", type: "percent", value: 5 });

    await request(app)
      .patch(`/api/coupons/${createRes.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "TOGGLE", subtotal: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer active/i);
  });
});
