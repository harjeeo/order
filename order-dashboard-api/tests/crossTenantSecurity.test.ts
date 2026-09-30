import bcrypt from "bcryptjs";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

// Regression coverage for a class of bug found in a manual security
// review: several `update`/`delete`-by-id routes looked up records by
// bare Prisma `id` with no tenantId filter, so any authenticated staff
// member (of any tenant) could read/modify/delete another tenant's data
// just by guessing/knowing an id. Also covers a privilege-escalation gap
// where any staff role (not just Admin/Manager) could PATCH any user,
// including granting themselves Admin.
describe("cross-tenant authorization boundaries", () => {
  let tenantA: any;
  let tenantB: any;

  beforeAll(async () => {
    tenantA = await createTenantWithAdmin("Tenant A Security");
    tenantB = await createTenantWithAdmin("Tenant B Security");
  });

  afterAll(async () => {
    await deleteTenant(tenantA.tenant.id);
    await deleteTenant(tenantB.tenant.id);
    await prisma.$disconnect();
  });

  it("blocks tenant A staff from modifying tenant B's customer", async () => {
    const customerB = await prisma.customer.create({
      data: { tenantId: tenantB.tenant.id, name: "B Customer", phone: "9990001111" },
    });

    const patchRes = await request(app)
      .patch(`/api/customers/${customerB.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ name: "Hijacked" });
    expect(patchRes.status).toBe(404);

    const stillIntact = await prisma.customer.findUnique({ where: { id: customerB.id } });
    expect(stillIntact?.name).toBe("B Customer");

    const deleteRes = await request(app)
      .delete(`/api/customers/${customerB.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(deleteRes.status).toBe(200); // no-op delete, doesn't leak existence
    const stillThere = await prisma.customer.findUnique({ where: { id: customerB.id } });
    expect(stillThere).not.toBeNull();
  });

  it("blocks tenant A staff from modifying tenant B's order", async () => {
    const category = await prisma.menuCategory.create({ data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, name: "Cat" } });
    const item = await prisma.menuItem.create({
      data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, categoryId: category.id, name: "Item", price: 100 },
    });
    const orderB = await prisma.order.create({
      data: {
        tenantId: tenantB.tenant.id,
        outletId: tenantB.outlet.id,
        orderNumber: "TEST-B-1",
        orderType: "takeaway",
        status: "pending",
        amount: 100,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: 100 }] },
      },
    });

    const statusRes = await request(app)
      .patch(`/api/orders/${orderB.id}/status`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ status: "completed" });
    expect(statusRes.status).toBe(404);

    const cancelRes = await request(app)
      .post(`/api/orders/${orderB.id}/cancel`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(cancelRes.status).toBe(404);

    const refundRes = await request(app)
      .post(`/api/orders/${orderB.id}/refund`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(refundRes.status).toBe(404);

    const stillIntact = await prisma.order.findUnique({ where: { id: orderB.id } });
    expect(stillIntact?.status).toBe("pending");
    expect(stillIntact?.paymentStatus).not.toBe("refunded");
  });

  it("blocks tenant A staff from settling payment on tenant B's order", async () => {
    const category = await prisma.menuCategory.create({ data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, name: "Cat Pay" } });
    const item = await prisma.menuItem.create({
      data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, categoryId: category.id, name: "Item Pay", price: 100 },
    });
    const orderB = await prisma.order.create({
      data: {
        tenantId: tenantB.tenant.id,
        outletId: tenantB.outlet.id,
        orderNumber: "TEST-B-PAY",
        orderType: "takeaway",
        status: "pending",
        amount: 100,
        items: { create: [{ menuItemId: item.id, name: item.name, qty: 1, unitPrice: 100 }] },
      },
    });

    const payRes = await request(app)
      .post(`/api/billing/orders/${orderB.id}/pay`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ subtotal: 100, total: 100, method: "cash" });
    expect(payRes.status).toBe(404);

    const stillIntact = await prisma.order.findUnique({ where: { id: orderB.id } });
    expect(stillIntact?.paymentStatus).toBe("unpaid");
    expect(stillIntact?.status).toBe("pending");
  });

  it("blocks tenant A staff from modifying tenant B's menu item", async () => {
    const category = await prisma.menuCategory.create({ data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, name: "Cat2" } });
    const itemB = await prisma.menuItem.create({
      data: { tenantId: tenantB.tenant.id, outletId: tenantB.outlet.id, categoryId: category.id, name: "B Item", price: 200 },
    });

    const patchRes = await request(app)
      .patch(`/api/menu/items/${itemB.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ name: "Hijacked Item" });
    expect(patchRes.status).toBe(404);

    const toggleRes = await request(app)
      .post(`/api/menu/items/${itemB.id}/toggle-availability`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(toggleRes.status).toBe(404);

    const stillIntact = await prisma.menuItem.findUnique({ where: { id: itemB.id } });
    expect(stillIntact?.name).toBe("B Item");
    expect(stillIntact?.available).toBe(true);
  });

  it("blocks tenant A staff from modifying tenant B's staff account", async () => {
    const staffB = await prisma.user.findFirstOrThrow({ where: { tenantId: tenantB.tenant.id, role: "ADMIN" } });

    const patchRes = await request(app)
      .patch(`/api/staff/${staffB.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ role: "WAITER" });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/staff/${staffB.id}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(deleteRes.status).toBe(200); // no-op delete

    const stillThere = await prisma.user.findUnique({ where: { id: staffB.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.role).toBe("ADMIN");
  });

  it("rejects a non-manager staff member editing any staff account", async () => {
    const email = `waiter-${Date.now()}@example.test`;
    const passwordHash = await bcrypt.hash("password123", 10);
    const waiter = await prisma.user.create({
      data: { tenantId: tenantA.tenant.id, name: "Waiter", email, passwordHash, role: "WAITER" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    const waiterToken = loginRes.body.token;

    const res = await request(app)
      .patch(`/api/staff/${waiter.id}`)
      .set("Authorization", `Bearer ${waiterToken}`)
      .send({ role: "ADMIN" });
    expect(res.status).toBe(403);

    const stillWaiter = await prisma.user.findUnique({ where: { id: waiter.id } });
    expect(stillWaiter?.role).toBe("WAITER");
  });

  it("prevents a Manager from granting themselves Admin via staff PATCH", async () => {
    const email = `manager-${Date.now()}@example.test`;
    const passwordHash = await bcrypt.hash("password123", 10);
    const manager = await prisma.user.create({
      data: { tenantId: tenantA.tenant.id, name: "Manager", email, passwordHash, role: "MANAGER" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    const managerToken = loginRes.body.token;

    const res = await request(app)
      .patch(`/api/staff/${manager.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ role: "ADMIN", permissions: { Settings: true } });
    expect(res.status).toBe(200);

    const stillManager = await prisma.user.findUnique({ where: { id: manager.id } });
    expect(stillManager?.role).toBe("MANAGER");
  });

  it("prevents a Manager from creating a new Admin account", async () => {
    const email = `manager2-${Date.now()}@example.test`;
    const passwordHash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: { tenantId: tenantA.tenant.id, name: "Manager 2", email, passwordHash, role: "MANAGER" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    const managerToken = loginRes.body.token;

    const res = await request(app)
      .post("/api/staff")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "New Admin", email: `new-admin-${Date.now()}@example.test`, role: "ADMIN" });
    expect(res.status).toBe(403);
  });
});
