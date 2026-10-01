import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("cafe reports", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Reports");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  async function makeOrder(opts: {
    orderNumber: string;
    itemName: string;
    price: number;
    qty: number;
    tax?: number;
    orderType?: string;
    source?: string;
    createdAt?: Date;
  }) {
    const category = await prisma.menuCategory.create({
      data: { tenantId: ctx.tenant.id, outletId: ctx.outlet.id, name: `Cat ${opts.orderNumber}` },
    });
    await prisma.menuItem.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        categoryId: category.id,
        name: opts.itemName,
        price: opts.price,
        tax: opts.tax ?? 5,
      },
    });
    const order = await prisma.order.create({
      data: {
        tenantId: ctx.tenant.id,
        outletId: ctx.outlet.id,
        orderNumber: opts.orderNumber,
        orderType: (opts.orderType as any) ?? "dine_in",
        source: (opts.source as any) ?? "staff",
        status: "completed",
        paymentStatus: "paid",
        amount: opts.price * opts.qty,
        createdAt: opts.createdAt ?? new Date(),
        items: { create: [{ name: opts.itemName, qty: opts.qty, unitPrice: opts.price }] },
      },
    });
    // createdAt is a @default(now()) field without updateMany override at
    // create time in some Prisma versions for non-standard fields; force it.
    if (opts.createdAt) {
      await prisma.order.update({ where: { id: order.id }, data: { createdAt: opts.createdAt } });
    }
    return order;
  }

  it("filters by date range instead of returning all-time data for every tab", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    await makeOrder({ orderNumber: "RPT-OLD", itemName: "Old Item", price: 100, qty: 1, createdAt: tenDaysAgo });
    await makeOrder({ orderNumber: "RPT-TODAY", itemName: "Today Item", price: 200, qty: 1 });

    const daily = await request(app).get("/api/reports?range=daily").set("Authorization", `Bearer ${ctx.token}`);
    expect(daily.body.sales.total).toBe(200); // only today's order

    const weekly = await request(app).get("/api/reports?range=weekly").set("Authorization", `Bearer ${ctx.token}`);
    expect(weekly.body.sales.total).toBe(200); // 10 days ago is outside a 7-day window

    const monthly = await request(app).get("/api/reports?range=monthly").set("Authorization", `Bearer ${ctx.token}`);
    expect(monthly.body.sales.total).toBe(300); // both orders inside a 30-day window
  });

  it("breaks sales down by channel, including the online cross-cut", async () => {
    await makeOrder({ orderNumber: "RPT-DINE", itemName: "Dine Item", price: 150, qty: 1, orderType: "dine_in" });
    await makeOrder({ orderNumber: "RPT-TAKE", itemName: "Takeaway Item", price: 80, qty: 1, orderType: "takeaway" });
    await makeOrder({
      orderNumber: "RPT-ONLINE",
      itemName: "Online Item",
      price: 120,
      qty: 1,
      orderType: "dine_in",
      source: "customer",
    });

    const res = await request(app).get("/api/reports?range=monthly").set("Authorization", `Bearer ${ctx.token}`);
    expect(res.body.channels.dineIn.amount).toBeGreaterThanOrEqual(150 + 120);
    expect(res.body.channels.takeaway.amount).toBeGreaterThanOrEqual(80);
    expect(res.body.channels.online.orders).toBe(1);
    expect(res.body.channels.online.amount).toBe(120);
  });

  it("reports the full item sales list and a per-item tax breakdown", async () => {
    await makeOrder({ orderNumber: "RPT-TAX", itemName: "Taxed Item", price: 100, qty: 3, tax: 12 });

    const res = await request(app).get("/api/reports?range=monthly").set("Authorization", `Bearer ${ctx.token}`);
    const allItemNames = res.body.products.allItems.map((i: any) => i.name);
    expect(allItemNames).toContain("Taxed Item");
    // allItems is not capped at 5 like bestSellers
    expect(res.body.products.allItems.length).toBeGreaterThan(5);

    const taxRow = res.body.products.taxByItem.find((i: any) => i.name === "Taxed Item");
    expect(taxRow.qty).toBe(3);
    expect(taxRow.taxableValue).toBe(300);
    expect(taxRow.taxPercent).toBe(12);
    expect(taxRow.taxAmount).toBe(36);
  });
});
