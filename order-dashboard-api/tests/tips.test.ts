import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("tip amount on payment", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Tips Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  async function createUnpaidOrder() {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "takeaway",
        items: [{ name: "Coffee", qty: 1, unitPrice: 100 }],
        amount: 100,
        action: "save",
      });
    return res.body.id;
  }

  it("records the tip amount separately from the bill total", async () => {
    const orderId = await createUnpaidOrder();
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 105, tipAmount: 20, method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(105);
    expect(res.body.tipAmount).toBe(20);
  });

  it("defaults the tip to 0 when not provided", async () => {
    const orderId = await createUnpaidOrder();
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 105, method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.tipAmount).toBe(0);
  });

  it("rejects a negative tip by clamping it to 0", async () => {
    const orderId = await createUnpaidOrder();
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 105, tipAmount: -50, method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.tipAmount).toBe(0);
  });
});
