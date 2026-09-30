import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("table running bills", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Table Bills");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(tableId: string, amount: number, orderNumber: string) {
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
        tableId,
        amount,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: amount }] },
      },
    });
  }

  it("reports the running amount and active order on the table list", async () => {
    const table = await prisma.table.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, number: "RB-1", capacity: 4, status: "occupied", occupiedAt: new Date() },
    });
    await makeOrder(table.id, 100, "RB-ORD-1");
    await makeOrder(table.id, 50, "RB-ORD-2");

    const res = await request(app).get("/api/tables").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    const found = res.body.find((t: any) => t.id === table.id);
    expect(found.runningAmount).toBe(150);
    expect(found.activeOrder.orderNumber).toBe("RB-ORD-2"); // most recently created
  });

  it("moves the running bill to the target table on transfer", async () => {
    const from = await prisma.table.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, number: "RB-FROM", capacity: 2, status: "occupied", occupiedAt: new Date() },
    });
    const to = await prisma.table.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, number: "RB-TO", capacity: 2, status: "available" },
    });
    await makeOrder(from.id, 200, "RB-TRANSFER-1");

    const res = await request(app)
      .post(`/api/tables/${from.id}/transfer/${to.id}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);

    const fromAfter = res.body.find((t: any) => t.id === from.id);
    const toAfter = res.body.find((t: any) => t.id === to.id);
    expect(fromAfter.status).toBe("available");
    expect(fromAfter.runningAmount).toBe(0);
    expect(toAfter.status).toBe("occupied");
    expect(toAfter.runningAmount).toBe(200);
  });

  it("moves running bills from sources into the target on merge", async () => {
    const a = await prisma.table.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, number: "RB-A", capacity: 2, status: "occupied", occupiedAt: new Date() },
    });
    const b = await prisma.table.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, number: "RB-B", capacity: 2, status: "occupied", occupiedAt: new Date() },
    });
    await makeOrder(a.id, 80, "RB-MERGE-A");
    await makeOrder(b.id, 40, "RB-MERGE-B");

    const res = await request(app)
      .post("/api/tables/merge")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ sourceIds: [a.id, b.id], targetId: a.id });
    expect(res.status).toBe(200);

    const aAfter = res.body.find((t: any) => t.id === a.id);
    const bAfter = res.body.find((t: any) => t.id === b.id);
    expect(aAfter.runningAmount).toBe(120);
    expect(bAfter.status).toBe("available");
    expect(bAfter.runningAmount).toBe(0);
  });
});
