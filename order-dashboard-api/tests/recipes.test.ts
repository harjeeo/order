import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("recipes + automatic stock deduction", () => {
  let tenantId: string;
  let token: string;
  let menuItemId: string;
  let ingredientId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Recipe Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    const category = await prisma.menuCategory.create({ data: { tenantId, name: "Burgers" } });
    const menuItem = await prisma.menuItem.create({
      data: { tenantId, categoryId: category.id, name: "Cheese Burger", price: 179 },
    });
    menuItemId = menuItem.id;

    const ingredient = await prisma.ingredient.create({
      data: { tenantId, name: "Cheese", unit: "kg", stock: 8, minimum: 2 },
    });
    ingredientId = ingredient.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("saves a recipe linking the menu item to an ingredient", async () => {
    const res = await request(app)
      .put(`/api/recipes/${menuItemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ingredients: [{ ingredientId, qty: 0.05 }] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ ingredientId, qty: 0.05 });
  });

  it("returns the saved recipe on GET", async () => {
    const res = await request(app).get(`/api/recipes/${menuItemId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ingredientName).toBe("Cheese");
  });

  it("deducts ingredient stock proportional to quantity ordered", async () => {
    const before = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    expect(before.stock).toBe(8);

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "dine_in",
        items: [{ menuItemId, name: "Cheese Burger", qty: 2, unitPrice: 179 }],
        amount: 358,
        action: "save",
      });
    expect(orderRes.status).toBe(201);

    const after = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    expect(after.stock).toBeCloseTo(7.9, 5);

    const movements = await prisma.stockMovement.findMany({ where: { tenantId, ingredientId } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: "out", qty: 0.1 });
    expect(movements[0].note).toContain(orderRes.body.orderNumber);
  });

  it("never drops stock below zero even if ordered quantity exceeds it", async () => {
    // Deplete remaining stock with a large order, then order again.
    await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "dine_in",
        items: [{ menuItemId, name: "Cheese Burger", qty: 1000, unitPrice: 179 }],
        amount: 179000,
        action: "save",
      });

    const after = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    expect(after.stock).toBe(0);
  });
});
