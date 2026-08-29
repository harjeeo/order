import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("public slug-based menu ordering", () => {
  let tenantId: string;
  let slug: string;
  let menuItemId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Slug Menu Test Cafe");
    tenantId = t.tenant.id;
    slug = t.tenant.slug;

    await prisma.settings.upsert({
      where: { tenantId },
      update: { restaurant: { logo: "☕", about: "Fresh brews, daily." } },
      create: { tenantId, restaurant: { logo: "☕", about: "Fresh brews, daily." } },
    });

    const category = await prisma.menuCategory.create({ data: { tenantId, outletId: t.outlet.id, name: "Drinks" } });
    const item = await prisma.menuItem.create({
      data: { tenantId, outletId: t.outlet.id, categoryId: category.id, name: "Iced Latte", price: 180, available: true },
    });
    menuItemId = item.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await request(app).get(`/api/public/menu/nonexistent-cafe-slug`);
    expect(res.status).toBe(404);
  });

  it("serves the public menu by slug without auth, including logo and about", async () => {
    const res = await request(app).get(`/api/public/menu/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.tenantName).toBeTruthy();
    expect(res.body.logo).toBe("☕");
    expect(res.body.about).toBe("Fresh brews, daily.");
    expect(res.body.items.some((i: any) => i.id === menuItemId)).toBe(true);
  });

  it("excludes unavailable items from the public slug menu", async () => {
    const category = await prisma.menuCategory.findFirstOrThrow({ where: { tenantId } });
    const hidden = await prisma.menuItem.create({
      data: { tenantId, outletId: category.outletId, categoryId: category.id, name: "86'd Item", price: 99, available: false },
    });
    const res = await request(app).get(`/api/public/menu/${slug}`);
    expect(res.body.items.some((i: any) => i.id === hidden.id)).toBe(false);
  });

  it("places a takeaway order by slug without auth", async () => {
    const res = await request(app)
      .post(`/api/public/menu/${slug}/orders`)
      .send({
        customerName: "IG Guest",
        customerPhone: "9123456780",
        items: [{ menuItemId, name: "Iced Latte", qty: 2, unitPrice: 180 }],
        amount: 360,
      });
    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBeTruthy();

    const order = await prisma.order.findFirst({ where: { tenantId, orderNumber: res.body.orderNumber } });
    expect(order?.source).toBe("customer");
    expect(order?.orderType).toBe("takeaway");
    expect(order?.tableId).toBeNull();

    const kot = await prisma.kitchenTicket.findFirst({ where: { orderId: order!.id } });
    expect(kot).not.toBeNull();
  });

  it("rejects a public slug order with no customer name or phone", async () => {
    const res = await request(app)
      .post(`/api/public/menu/${slug}/orders`)
      .send({ items: [{ menuItemId, name: "Iced Latte", qty: 1, unitPrice: 180 }], amount: 180 });
    expect(res.status).toBe(400);
  });

  it("reuses an existing customer record by phone across repeat slug orders", async () => {
    const body = {
      customerName: "Repeat IG Guest",
      customerPhone: "9112223330",
      items: [{ menuItemId, name: "Iced Latte", qty: 1, unitPrice: 180 }],
      amount: 180,
    };
    const first = await request(app).post(`/api/public/menu/${slug}/orders`).send(body);
    const second = await request(app).post(`/api/public/menu/${slug}/orders`).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const customers = await prisma.customer.findMany({ where: { tenantId, phone: "9112223330" } });
    expect(customers).toHaveLength(1);

    const orders = await prisma.order.findMany({ where: { tenantId, customerId: customers[0].id } });
    expect(orders).toHaveLength(2);
  });

  it("404s for a slug order against an inactive tenant", async () => {
    const other = await createTenantWithAdmin("Inactive Slug Cafe");
    await prisma.tenant.update({ where: { id: other.tenant.id }, data: { status: "suspended" } });
    const res = await request(app)
      .get(`/api/public/menu/${other.tenant.slug}`);
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
