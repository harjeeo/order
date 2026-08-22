import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("GST sales register export", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("GST Export Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    await request(app).patch("/api/settings/tax").set("Authorization", `Bearer ${token}`).send({ gstin: "29ABCDE1234F1Z5" });

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderType: "takeaway", items: [{ name: "Coffee", qty: 1, unitPrice: 100 }], amount: 100, action: "save" });
    await request(app)
      .post(`/api/billing/orders/${orderRes.body.id}/pay`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subtotal: 100, discountAmount: 0, taxAmount: 5, total: 105, method: "cash" });
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("returns a CSV with the GSTIN and the invoice row", async () => {
    const res = await request(app).get("/api/reports/gst-export").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("29ABCDE1234F1Z5");
    expect(res.text).toContain("105");
    expect(res.text).toContain("TOTAL");
  });

  it("excludes invoices outside the requested date range", async () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/reports/gst-export?from=${future}&to=${future}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("105");
  });
});
