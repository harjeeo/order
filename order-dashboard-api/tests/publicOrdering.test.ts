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
        items: [{ menuItemId, name: "Cold Coffee", qty: 2, unitPrice: 150 }],
        amount: 300,
      });
    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBeTruthy();

    const order = await prisma.order.findFirst({ where: { tenantId, orderNumber: res.body.orderNumber } });
    expect(order?.source).toBe("customer");
    expect(order?.orderType).toBe("dine_in");

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    expect(table?.status).toBe("occupied");

    const kot = await prisma.kitchenTicket.findFirst({ where: { orderId: order!.id } });
    expect(kot).not.toBeNull();
  });

  it("rejects a public order for a table that doesn't belong to the tenant", async () => {
    const other = await createTenantWithAdmin("Other Cafe 2");
    const res = await request(app)
      .post(`/api/public/${other.tenant.id}/orders`)
      .send({ tableId, items: [{ name: "X", qty: 1 }], amount: 10 });
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
