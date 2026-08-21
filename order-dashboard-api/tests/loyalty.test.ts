import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("loyalty points: earn and redeem", () => {
  let tenantId: string;
  let token: string;
  let menuItemId: string;
  let customerId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Loyalty Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    const category = await prisma.menuCategory.create({ data: { tenantId, name: "Test Category" } });
    const menuItem = await prisma.menuItem.create({
      data: { tenantId, categoryId: category.id, name: "Loyalty Item", price: 500 },
    });
    menuItemId = menuItem.id;

    const customer = await prisma.customer.create({ data: { tenantId, name: "Loyal Customer", loyaltyPoints: 50 } });
    customerId = customer.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  async function placeOrder(amount: number) {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "dine_in",
        customerId,
        items: [{ menuItemId, name: "Loyalty Item", qty: 1, unitPrice: amount }],
        amount,
        action: "save",
      });
    return res.body.id as string;
  }

  it("earns 1 point per ₹100 spent on a paid order", async () => {
    const orderId = await placeOrder(500);
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 500, total: 500, method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.pointsEarned).toBe(5);
    expect(res.body.customerPointsBalance).toBe(55); // 50 starting + 5 earned

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(customer?.loyaltyPoints).toBe(55);
  });

  it("redeems points and deducts them from the balance", async () => {
    const orderId = await placeOrder(200);
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 200, discountAmount: 20, total: 180, method: "cash", redeemPoints: 20 });

    expect(res.status).toBe(201);
    // balance was 55; -20 redeemed +1 earned (floor(180/100)) = 36
    expect(res.body.customerPointsBalance).toBe(36);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(customer?.loyaltyPoints).toBe(36);
  });

  it("rejects redeeming more points than the customer has", async () => {
    const orderId = await placeOrder(100);
    const res = await request(app)
      .post(`/api/billing/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, total: 100, method: "cash", redeemPoints: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only has/i);
  });

  it("does nothing to loyalty points for a walk-in order with no customer", async () => {
    const res1 = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "dine_in",
        items: [{ menuItemId, name: "Loyalty Item", qty: 1, unitPrice: 300 }],
        amount: 300,
        action: "save",
      });

    const res = await request(app)
      .post(`/api/billing/orders/${res1.body.id}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 300, total: 300, method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.pointsEarned).toBe(0);
    expect(res.body.customerPointsBalance).toBeNull();
  });

  it("exposes loyaltyPoints on GET /api/customers/:id", async () => {
    const res = await request(app).get(`/api/customers/${customerId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.loyaltyPoints).toBe(36);
  });

  it("404s for a customer id from another tenant", async () => {
    const other = await createTenantWithAdmin("Other Loyalty Cafe");
    const res = await request(app).get(`/api/customers/${customerId}`).set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
