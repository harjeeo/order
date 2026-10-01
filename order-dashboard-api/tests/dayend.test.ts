import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("day end closing", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Day End");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(opts: {
    orderNumber: string;
    amount: number;
    status?: string;
    paymentStatus?: string;
    source?: string;
    invoiceMethod?: string;
  }) {
    const category = await prisma.menuCategory.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, name: `Cat ${opts.orderNumber}` },
    });
    const item = await prisma.menuItem.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        categoryId: category.id,
        name: `Item ${opts.orderNumber}`,
        price: Math.abs(opts.amount) || 1,
      },
    });
    const order = await prisma.order.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        orderNumber: opts.orderNumber,
        orderType: "dine_in",
        source: (opts.source as any) ?? "staff",
        status: (opts.status as any) ?? "completed",
        paymentStatus: (opts.paymentStatus as any) ?? "paid",
        amount: opts.amount,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: Math.abs(opts.amount) || 1 }] },
      },
    });
    if (opts.invoiceMethod) {
      await prisma.invoice.create({
        data: {
          tenantId: ctx.tenant.id,
          outletId: ctx.outlet.id,
          invoiceNumber: `INV-${opts.orderNumber}`,
          orderId: order.id,
          subtotal: Math.abs(opts.amount),
          total: opts.amount,
          method: opts.invoiceMethod,
        },
      });
    }
    return order;
  }

  it("buckets orders correctly and computes expected cash", async () => {
    await makeOrder({ orderNumber: "DE-SUCCESS", amount: 500, invoiceMethod: "cash" });
    await makeOrder({ orderNumber: "DE-CANCEL", amount: 200, status: "cancelled", paymentStatus: "unpaid" });
    await makeOrder({ orderNumber: "DE-COMP", amount: 0, invoiceMethod: "complimentary" });
    await makeOrder({ orderNumber: "DE-RETURN", amount: -150, invoiceMethod: "sales_return" });
    await makeOrder({ orderNumber: "DE-DUE", amount: 300, paymentStatus: "unpaid" });
    await makeOrder({ orderNumber: "DE-ONLINE", amount: 250, source: "customer", invoiceMethod: "cash" });

    await prisma.expense.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        category: "Milk",
        amount: 50,
        date: new Date(),
        method: "Cash",
      },
    });

    const res = await request(app).get("/api/dayend/preview").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.successOrders).toBe(2); // DE-SUCCESS + DE-ONLINE both paid via cash
    expect(res.body.successAmount).toBe(750);
    expect(res.body.cancelledOrders).toBe(1);
    expect(res.body.cancelledAmount).toBe(200);
    expect(res.body.complimentaryOrders).toBe(1);
    expect(res.body.salesReturnOrders).toBe(1);
    expect(res.body.salesReturnAmount).toBe(150);
    expect(res.body.dueOrders).toBe(1);
    expect(res.body.dueAmount).toBe(300);
    expect(res.body.onlineOrders).toBe(1);
    expect(res.body.onlineAmount).toBe(250);
    // cash invoices (500 + 250) minus cash expense (50)
    expect(res.body.expectedCash).toBe(700);
  });

  it("closing the day records a reconciliation and starts the next period fresh", async () => {
    const previewBefore = await request(app).get("/api/dayend/preview").set("Authorization", `Bearer ${ctx.token}`);
    const expectedCash = previewBefore.body.expectedCash;

    const closeRes = await request(app)
      .post("/api/dayend/close")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ countedCash: expectedCash - 20, notes: "short by 20" });
    expect(closeRes.status).toBe(201);
    expect(closeRes.body.difference).toBe(-20);
    expect(closeRes.body.notes).toBe("short by 20");

    const historyRes = await request(app).get("/api/dayend/history").set("Authorization", `Bearer ${ctx.token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.items.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body.items[0].id).toBe(closeRes.body.id);

    const previewAfter = await request(app).get("/api/dayend/preview").set("Authorization", `Bearer ${ctx.token}`);
    expect(previewAfter.body.successOrders).toBe(0);
    expect(previewAfter.body.expectedCash).toBe(0);
    expect(new Date(previewAfter.body.periodStart).getTime()).toBe(new Date(closeRes.body.periodEnd).getTime());
  });
});
