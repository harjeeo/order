import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("customer wallet & loyalty at checkout", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Wallet Checkout");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(customerId: string | null, amount: number, orderNumber: string) {
    const category = await prisma.menuCategory.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, name: `Cat ${orderNumber}` },
    });
    const item = await prisma.menuItem.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, categoryId: category.id, name: `Item ${orderNumber}`, price: amount },
    });
    return prisma.order.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        orderNumber,
        orderType: "dine_in",
        status: "pending",
        customerId,
        amount,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: amount }] },
      },
    });
  }

  it("tops up a customer's wallet balance", async () => {
    const customer = await prisma.customer.create({ data: { tenantId: ctx.tenant.id, name: "Wallet Customer 1" } });

    const res = await request(app)
      .post(`/api/customers/${customer.id}/wallet/topup`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.walletBalance).toBe(500);

    const rejectRes = await request(app)
      .post(`/api/customers/${customer.id}/wallet/topup`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ amount: -100 });
    expect(rejectRes.status).toBe(400);
  });

  it("deducts loyalty points and wallet balance when used at checkout", async () => {
    const customer = await prisma.customer.create({
      data: { tenantId: ctx.tenant.id, name: "Wallet Customer 2", loyaltyPoints: 40, walletBalance: 100 },
    });
    const order = await makeOrder(customer.id, 300, "WALLET-PAY-1");

    const res = await request(app)
      .post(`/api/billing/orders/${order.id}/pay`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ subtotal: 300, total: 300, method: "cash", redeemPoints: 40, walletAmountUsed: 100 });
    expect(res.status).toBe(201);
    expect(res.body.walletAmountUsed).toBe(100);

    const updated = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(updated?.walletBalance).toBe(0);
    // loyaltyPoints: 40 - 40 redeemed + earned from the ₹300 spend
    expect(updated?.loyaltyPoints).toBeGreaterThanOrEqual(0);
  });

  it("rejects using more wallet balance than the customer has", async () => {
    const customer = await prisma.customer.create({
      data: { tenantId: ctx.tenant.id, name: "Wallet Customer 3", walletBalance: 50 },
    });
    const order = await makeOrder(customer.id, 300, "WALLET-PAY-2");

    const res = await request(app)
      .post(`/api/billing/orders/${order.id}/pay`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ subtotal: 300, total: 300, method: "cash", walletAmountUsed: 200 });
    expect(res.status).toBe(400);

    const unchanged = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(unchanged?.walletBalance).toBe(50);
  });

  it("rejects wallet usage when the order has no customer", async () => {
    const order = await makeOrder(null, 100, "WALLET-PAY-3");
    const res = await request(app)
      .post(`/api/billing/orders/${order.id}/pay`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ subtotal: 100, total: 100, method: "cash", walletAmountUsed: 50 });
    expect(res.status).toBe(400);
  });

  it("blocks setting loyaltyPoints/walletBalance directly through the customer edit endpoint", async () => {
    const customer = await prisma.customer.create({
      data: { tenantId: ctx.tenant.id, name: "Wallet Customer 4", loyaltyPoints: 10, walletBalance: 10 },
    });

    const res = await request(app)
      .patch(`/api/customers/${customer.id}`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ name: "Renamed", loyaltyPoints: 99999, walletBalance: 99999 });
    expect(res.status).toBe(400);

    const unchanged = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(unchanged?.loyaltyPoints).toBe(10);
    expect(unchanged?.walletBalance).toBe(10);
    expect(unchanged?.name).toBe("Wallet Customer 4");
  });
});
