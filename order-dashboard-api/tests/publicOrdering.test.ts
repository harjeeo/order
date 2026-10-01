import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("public QR ordering", () => {
  let tenantId: string;
  let tableId: string;
  let menuItemId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("QR Order Test Cafe");
    tenantId = t.tenant.id;

    const category = await prisma.menuCategory.create({ data: { tenantId, outletId: t.outlet.id, name: "Drinks" } });
    const item = await prisma.menuItem.create({
      data: { tenantId, outletId: t.outlet.id, categoryId: category.id, name: "Cold Coffee", price: 150, available: true },
    });
    menuItemId = item.id;

    const table = await prisma.table.create({ data: { tenantId, outletId: t.outlet.id, number: "T1", capacity: 4 } });
    tableId = table.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("returns 404 for an unknown tenant", async () => {
    const res = await request(app).get(`/api/public/nonexistent-tenant/tables/${tableId}/menu`);
    expect(res.status).toBe(404);
  });

  it("serves the public menu without auth, scoped to the table's outlet", async () => {
    const res = await request(app).get(`/api/public/${tenantId}/tables/${tableId}/menu`);
    expect(res.status).toBe(200);
    expect(res.body.tenantName).toBeTruthy();
    expect(res.body.items.some((i: any) => i.id === menuItemId)).toBe(true);
  });

  it("excludes unavailable items from the public menu", async () => {
    const category = await prisma.menuCategory.findFirstOrThrow({ where: { tenantId } });
    const hidden = await prisma.menuItem.create({
      data: { tenantId, outletId: category.outletId, categoryId: category.id, name: "86'd Item", price: 99, available: false },
    });
    const res = await request(app).get(`/api/public/${tenantId}/tables/${tableId}/menu`);
    expect(res.body.items.some((i: any) => i.id === hidden.id)).toBe(false);
  });

  it("looks up a table by id", async () => {
    const res = await request(app).get(`/api/public/${tenantId}/tables/${tableId}`);
    expect(res.status).toBe(200);
    expect(res.body.number).toBe("T1");
  });

  it("404s for a table from a different tenant", async () => {
    const other = await createTenantWithAdmin("Other Cafe");
    const res = await request(app).get(`/api/public/${other.tenant.id}/tables/${tableId}`);
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });

  it("places a customer order without auth and marks the table occupied", async () => {
    const res = await request(app)
      .post(`/api/public/${tenantId}/orders`)
      .send({
        tableId,
        customerName: "QR Guest",
        customerPhone: "9876543210",
        items: [{ menuItemId, qty: 2 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBeTruthy();

    const order = await prisma.order.findFirst({ where: { tenantId, orderNumber: res.body.orderNumber } });
    expect(order?.source).toBe("customer");
    expect(order?.orderType).toBe("dine_in");
    // Price came from the menu (150), not the client — confirms the order
    // wasn't just trusting a client-supplied amount.
    expect(order?.amount).toBe(300);

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    expect(table?.status).toBe("occupied");

    const kot = await prisma.kitchenTicket.findFirst({ where: { orderId: order!.id } });
    expect(kot).not.toBeNull();
  });

  it("rejects a public order with no customer name or phone", async () => {
    const res = await request(app)
      .post(`/api/public/${tenantId}/orders`)
      .send({ tableId, items: [{ menuItemId, qty: 1 }] });
    expect(res.status).toBe(400);
  });

  it("reuses an existing customer record by phone across repeat orders", async () => {
    const body = {
      tableId,
      customerName: "Repeat Guest",
      customerPhone: "9998887770",
      items: [{ menuItemId, qty: 1 }],
    };
    const first = await request(app).post(`/api/public/${tenantId}/orders`).send(body);
    const second = await request(app).post(`/api/public/${tenantId}/orders`).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const customers = await prisma.customer.findMany({ where: { tenantId, phone: "9998887770" } });
    expect(customers).toHaveLength(1);

    const orders = await prisma.order.findMany({ where: { tenantId, customerId: customers[0].id } });
    expect(orders).toHaveLength(2);
  });

  it("rejects a public order for a table that doesn't belong to the tenant", async () => {
    const other = await createTenantWithAdmin("Other Cafe 2");
    const res = await request(app)
      .post(`/api/public/${other.tenant.id}/orders`)
      .send({ tableId, customerName: "X", customerPhone: "9876543210", items: [{ menuItemId, qty: 1 }] });
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });

  it("ignores a client-supplied price and recomputes it from the real menu price", async () => {
    const res = await request(app)
      .post(`/api/public/${tenantId}/orders`)
      .send({
        tableId,
        customerName: "Price Tamperer",
        customerPhone: "9112233445",
        // A tampered request: real price is 150, but the client claims 1.
        items: [{ menuItemId, qty: 3, unitPrice: 1, name: "Cold Coffee (hacked)" }],
        amount: 3,
      });
    expect(res.status).toBe(201);

    const order = await prisma.order.findFirst({
      where: { tenantId, orderNumber: res.body.orderNumber },
      include: { items: true },
    });
    expect(order?.amount).toBe(450); // 3 x real menu price (150), not 3
    expect(order?.items[0].unitPrice).toBe(150);
    expect(order?.items[0].name).toBe("Cold Coffee");
  });

  it("rejects an order for a variant/addon name that doesn't exist on the menu item", async () => {
    const res = await request(app)
      .post(`/api/public/${tenantId}/orders`)
      .send({
        tableId,
        customerName: "Bad Variant",
        customerPhone: "9223344556",
        items: [{ menuItemId, qty: 1, variantName: "Does Not Exist" }],
      });
    expect(res.status).toBe(400);
  });
});
