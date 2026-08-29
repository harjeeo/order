import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("menu category deletion", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Menu Category Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("deletes an empty category", async () => {
    await request(app).post("/api/menu/categories").set("Authorization", `Bearer ${token}`).send({ name: "Empty Category" });
    const res = await request(app)
      .delete(`/api/menu/categories/${encodeURIComponent("Empty Category")}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const remaining = await prisma.menuCategory.findFirst({ where: { tenantId, name: "Empty Category" } });
    expect(remaining).toBeNull();
  });

  it("rejects deleting a category that still has menu items, without crashing", async () => {
    await request(app).post("/api/menu/categories").set("Authorization", `Bearer ${token}`).send({ name: "In Use Category" });
    const category = await prisma.menuCategory.findFirstOrThrow({ where: { tenantId, name: "In Use Category" } });
    await prisma.menuItem.create({
      data: { tenantId, outletId: category.outletId, categoryId: category.id, name: "Linked Item", price: 100 },
    });

    const res = await request(app)
      .delete(`/api/menu/categories/${encodeURIComponent("In Use Category")}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();

    const stillThere = await prisma.menuCategory.findUnique({ where: { id: category.id } });
    expect(stillThere).not.toBeNull();
  });

  it("no-ops deleting a category that doesn't exist", async () => {
    const res = await request(app)
      .delete(`/api/menu/categories/${encodeURIComponent("Nonexistent Category")}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
