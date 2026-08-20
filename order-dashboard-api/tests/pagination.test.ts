import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("customers pagination", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Pagination Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    await prisma.customer.createMany({
      data: [
        { tenantId, name: "Amit Kumar", phone: "9000000001" },
        { tenantId, name: "Bhavna Shah", phone: "9000000002" },
        { tenantId, name: "Chetan Rao", phone: "9000000003" },
      ],
    });
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("returns page 1 with the requested page size and correct total", async () => {
    const res = await request(app)
      .get("/api/customers")
      .query({ page: 1, pageSize: 2 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.items).toHaveLength(2);
  });

  it("returns the remaining item on page 2", async () => {
    const res = await request(app)
      .get("/api/customers")
      .query({ page: 2, pageSize: 2 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("clamps pageSize to a sane maximum", async () => {
    const res = await request(app)
      .get("/api/customers")
      .query({ page: 1, pageSize: 9999 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBeLessThanOrEqual(100);
    expect(res.body.items).toHaveLength(3);
  });
});
