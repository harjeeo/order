import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("SMS notifications (no provider configured — logged, not sent)", () => {
  let tenantId: string;
  let token: string;
  let customerId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("SMS Notifications Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    const customer = await prisma.customer.create({ data: { tenantId, name: "Notify Me", phone: "9998887777" } });
    customerId = customer.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("logs a notification when a KOT is marked ready for an order with a customer phone", async () => {
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "takeaway",
        customerId,
        items: [{ name: "Coffee", qty: 1, unitPrice: 100 }],
        amount: 100,
        action: "kitchen",
      });

    const kitchenRes = await request(app).get("/api/kitchen").set("Authorization", `Bearer ${token}`);
    const ticket = kitchenRes.body.find((k: any) => k.orderId === orderRes.body.id);

    const res = await request(app)
      .patch(`/api/kitchen/${ticket.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ready" });
    expect(res.status).toBe(200);

    // Best-effort SMS send happens fire-and-forget; give it a tick.
    await new Promise((r) => setTimeout(r, 100));

    const logs = await prisma.notificationLog.findMany({ where: { tenantId, to: "9998887777" } });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("logged");
    expect(logs[0].message).toMatch(/ready for pickup/i);
  });

  it("logs a notification when a bill is paid for an order with a customer phone", async () => {
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "takeaway",
        customerId,
        items: [{ name: "Coffee", qty: 1, unitPrice: 100 }],
        amount: 100,
        action: "save",
      });

    await request(app)
      .post(`/api/billing/orders/${orderRes.body.id}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 105, method: "cash" });

    await new Promise((r) => setTimeout(r, 100));

    const logs = await prisma.notificationLog.findMany({ where: { tenantId, to: "9998887777" } });
    expect(logs.some((l) => l.message.match(/payment of/i))).toBe(true);
  });

  it("does not log anything for a walk-in order with no customer", async () => {
    const before = await prisma.notificationLog.count({ where: { tenantId } });

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderType: "takeaway", items: [{ name: "Coffee", qty: 1, unitPrice: 100 }], amount: 100, action: "save" });
    await request(app)
      .post(`/api/billing/orders/${orderRes.body.id}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 105, method: "cash" });

    await new Promise((r) => setTimeout(r, 100));
    const after = await prisma.notificationLog.count({ where: { tenantId } });
    expect(after).toBe(before);
  });
});
