import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("multi-outlet / branch switching", () => {
  let tenantId: string;
  let token: string;
  let defaultOutletId: string;
  let secondOutletId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Multi Outlet Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
    defaultOutletId = t.outlet.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("lists the tenant's default outlet", async () => {
    const res = await request(app).get("/api/outlets").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].isDefault).toBe(true);
  });

  it("creates a second outlet", async () => {
    const res = await request(app)
      .post("/api/outlets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Branch 2", address: "Second location" });
    expect(res.status).toBe(201);
    secondOutletId = res.body.id;

    const list = await request(app).get("/api/outlets").set("Authorization", `Bearer ${token}`);
    expect(list.body).toHaveLength(2);
  });

  it("requests without X-Outlet-Id default to the tenant's default outlet", async () => {
    const res = await request(app)
      .post("/api/tables")
      .set("Authorization", `Bearer ${token}`)
      .send({ number: "D1", capacity: 2 });
    expect(res.status).toBe(201);

    const table = await prisma.table.findUnique({ where: { id: res.body.id } });
    expect(table?.outletId).toBe(defaultOutletId);
  });

  it("scopes tables to the outlet sent via X-Outlet-Id", async () => {
    await request(app)
      .post("/api/tables")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Outlet-Id", secondOutletId)
      .send({ number: "B1", capacity: 4 });

    const defaultList = await request(app)
      .get("/api/tables")
      .set("Authorization", `Bearer ${token}`);
    expect(defaultList.body.some((t: any) => t.number === "B1")).toBe(false);
    expect(defaultList.body.some((t: any) => t.number === "D1")).toBe(true);

    const branchList = await request(app)
      .get("/api/tables")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Outlet-Id", secondOutletId);
    expect(branchList.body.some((t: any) => t.number === "B1")).toBe(true);
    expect(branchList.body.some((t: any) => t.number === "D1")).toBe(false);
  });

  it("scopes menu categories/items to the outlet", async () => {
    await request(app)
      .post("/api/menu/categories")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Outlet-Id", secondOutletId)
      .send({ name: "Branch-only Category" });

    const defaultCategories = await request(app)
      .get("/api/menu/categories")
      .set("Authorization", `Bearer ${token}`);
    expect(defaultCategories.body).not.toContain("Branch-only Category");

    const branchCategories = await request(app)
      .get("/api/menu/categories")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Outlet-Id", secondOutletId);
    expect(branchCategories.body).toContain("Branch-only Category");
  });

  it("rejects an X-Outlet-Id that belongs to a different tenant", async () => {
    const other = await createTenantWithAdmin("Other Tenant For Outlet Test");
    const res = await request(app)
      .get("/api/tables")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Outlet-Id", other.outlet.id);
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
