import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("due payments", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Due Payments");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(orderNumber: string, status: string, paymentStatus: string, amount = 200) {
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
        status: status as any,
        paymentStatus: paymentStatus as any,
        amount,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: amount }] },
      },
    });
  }

  it("lists only served-and-billed orders settled as due, not still-cooking unpaid ones", async () => {
    await makeOrder("DUE-1", "completed", "unpaid", 300);
    await makeOrder("DUE-PENDING", "pending", "unpaid", 150); // not billed yet — shouldn't show here
    await makeOrder("DUE-PAID", "completed", "paid", 400); // already paid — shouldn't show
    await makeOrder("DUE-CANCELLED", "cancelled", "unpaid", 90);

    const res = await request(app).get("/api/billing/due-orders").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    const numbers = res.body.map((o: any) => o.orderNumber);
    expect(numbers).toEqual(["DUE-1"]);
  });

  it("settling a due order through the existing pay endpoint removes it from the due list", async () => {
    const order = await makeOrder("DUE-2", "completed", "unpaid", 250);

    const payRes = await request(app)
      .post(`/api/billing/orders/${order.id}/pay`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ subtotal: 250, total: 250, method: "cash" });
    expect(payRes.status).toBe(201);

    const res = await request(app).get("/api/billing/due-orders").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.body.find((o: any) => o.orderNumber === "DUE-2")).toBeUndefined();
  });
});
