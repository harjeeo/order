import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("DELETE /api/orders/:id", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Order Delete Test Cafe");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(orderNumber: string, status: string, paymentStatus: string, withInvoice = false) {
    const category = await prisma.menuCategory.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, name: `Cat ${orderNumber}` },
    });
    const item = await prisma.menuItem.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, categoryId: category.id, name: `Item ${orderNumber}`, price: 200 },
    });
    const order = await prisma.order.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        orderNumber,
        orderType: "dine_in",
        status: status as any,
        paymentStatus: paymentStatus as any,
        amount: 200,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: 200 }] },
      },
    });
    if (withInvoice) {
      await prisma.invoice.create({
        data: {
          tenantId: ctx.tenant.id,
          outletId: ctx.outlet.id,
          orderId: order.id,
          invoiceNumber: `INV-${orderNumber}`,
          subtotal: 200,
          total: 200,
          method: "cash",
        },
      });
    }
    return order;
  }

  it("deletes a pending, unpaid order outright", async () => {
    const order = await makeOrder("DEL-1", "pending", "unpaid");
    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);

    const gone = await prisma.order.findUnique({ where: { id: order.id } });
    expect(gone).toBeNull();
  });

  it("deletes a completed, paid order and its invoice together", async () => {
    const order = await makeOrder("DEL-2", "completed", "paid", true);
    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);

    const gone = await prisma.order.findUnique({ where: { id: order.id } });
    expect(gone).toBeNull();
    const invoiceGone = await prisma.invoice.findFirst({ where: { orderId: order.id } });
    expect(invoiceGone).toBeNull();
  });

  it("deletes a cancelled order too", async () => {
    const order = await makeOrder("DEL-3", "cancelled", "unpaid");
    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toBeNull();
  });

  it("cascades the order's items and kitchen ticket", async () => {
    const order = await makeOrder("DEL-4", "pending", "unpaid");
    await prisma.kitchenTicket.create({
      data: { tenantId: ctx.tenant.id, orderId: order.id, orderNumber: order.orderNumber },
    });
    const itemsBefore = await prisma.orderItem.count({ where: { orderId: order.id } });
    expect(itemsBefore).toBeGreaterThan(0);

    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);

    expect(await prisma.orderItem.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.kitchenTicket.findUnique({ where: { orderId: order.id } })).toBeNull();
  });

  it("404s for an order that doesn't exist", async () => {
    const res = await request(app).delete("/api/orders/nonexistent-id").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(404);
  });

  it("404s for an order belonging to another tenant", async () => {
    const other = await createTenantWithAdmin("Other Order Delete Cafe");
    const theirOrder = await prisma.order.create({
      data: {
        tenantId: other.tenant.id,
        outletId: other.outlet.id,
        orderNumber: "OTHER-1",
        orderType: "dine_in",
        amount: 100,
      },
    });

    const res = await request(app).delete(`/api/orders/${theirOrder.id}`).set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(404);
    expect(await prisma.order.findUnique({ where: { id: theirOrder.id } })).not.toBeNull();

    await deleteTenant(other.tenant.id);
  });

  it("rejects a non-manager role (e.g. a waiter)", async () => {
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const email = `waiter-${suffix}@example.test`;
    const passwordHash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: { tenantId: ctx.tenant.id, name: "Test Waiter", email, passwordHash, role: "WAITER" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    const waiterToken = loginRes.body.token;

    const order = await makeOrder("DEL-5", "pending", "unpaid");
    const res = await request(app).delete(`/api/orders/${order.id}`).set("Authorization", `Bearer ${waiterToken}`);
    expect(res.status).toBe(403);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).not.toBeNull();
  });
});
