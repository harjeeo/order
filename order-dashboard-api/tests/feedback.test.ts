import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("invoice feedback + reports aggregate", () => {
  let tenantId: string;
  let outletId: string;
  let token: string;
  let invoiceId: string;
  let invoiceNumber: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Feedback Test Cafe");
    tenantId = t.tenant.id;
    outletId = t.outlet.id;
    token = t.token;

    const category = await prisma.menuCategory.create({ data: { tenantId, outletId, name: "Test Category" } });
    const menuItem = await prisma.menuItem.create({
      data: { tenantId, outletId, categoryId: category.id, name: "Test Item", price: 100 },
    });

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "dine_in",
        items: [{ menuItemId: menuItem.id, name: "Test Item", qty: 1, unitPrice: 100 }],
        amount: 100,
        action: "save",
      });

    const payRes = await request(app)
      .post(`/api/billing/orders/${orderRes.body.id}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, discountAmount: 0, serviceChargeAmount: 0, taxAmount: 5, total: 105, method: "cash" });

    invoiceId = payRes.body.id;
    invoiceNumber = payRes.body.invoiceNumber;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("submits a rating + note and returns the updated invoice", async () => {
    const res = await request(app)
      .post(`/api/billing/invoices/${invoiceId}/feedback`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 5, note: "Great coffee!" });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.feedbackNote).toBe("Great coffee!");
  });

  it("rejects an out-of-range rating", async () => {
    const res = await request(app)
      .post(`/api/billing/invoices/${invoiceId}/feedback`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("404s for an invoice belonging to a different tenant", async () => {
    const other = await createTenantWithAdmin("Other Feedback Cafe");
    const res = await request(app)
      .post(`/api/billing/invoices/${invoiceId}/feedback`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ rating: 3 });
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });

  it("surfaces the rating in the Cafe Reports aggregate", async () => {
    const res = await request(app).get("/api/reports").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.feedback.count).toBe(1);
    expect(res.body.feedback.averageRating).toBe(5);
    expect(res.body.feedback.recent[0]).toMatchObject({ invoiceNumber, rating: 5, note: "Great coffee!" });
  });
});
