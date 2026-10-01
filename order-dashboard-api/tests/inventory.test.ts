import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("inventory ingredients", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Inventory");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  it("creates an ingredient with category, favourite, and active defaults", async () => {
    const res = await request(app)
      .post("/api/inventory/ingredients")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ name: "Milk", unit: "ltr", stock: 10, minimum: 2, category: "Dairy" });

    expect(res.status).toBe(201);
    expect(res.body.category).toBe("Dairy");
    expect(res.body.favourite).toBe(false);
    expect(res.body.active).toBe(true);
  });

  it("updates category, favourite, and active via PATCH", async () => {
    const create = await request(app)
      .post("/api/inventory/ingredients")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ name: "Flour", unit: "kg", stock: 20, minimum: 5 });
    const ingredientId = create.body.id;

    const patchRes = await request(app)
      .patch(`/api/inventory/ingredients/${ingredientId}`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ category: "Bakery", favourite: true, active: false });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.category).toBe("Bakery");
    expect(patchRes.body.favourite).toBe(true);
    expect(patchRes.body.active).toBe(false);

    const list = await request(app).get("/api/inventory/ingredients").set("Authorization", `Bearer ${ctx.token}`);
    const updated = list.body.find((i: any) => i.id === ingredientId);
    expect(updated.category).toBe("Bakery");
    expect(updated.favourite).toBe(true);
    expect(updated.active).toBe(false);
  });

  it("denies patching an ingredient belonging to another tenant", async () => {
    const other = await createTenantWithAdmin("Inventory Other");
    const create = await request(app)
      .post("/api/inventory/ingredients")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ name: "Sugar", unit: "kg", stock: 5, minimum: 1 });

    const patchRes = await request(app)
      .patch(`/api/inventory/ingredients/${create.body.id}`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ favourite: true });

    expect(patchRes.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
