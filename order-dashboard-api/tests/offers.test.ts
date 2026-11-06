import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("offers & combos", () => {
  let tenantId: string;
  let outletId: string;
  let token: string;
  const pizzaCategoryName = "Pizza";
  let pizzaItemId: string;
  let burgerItemId: string;
  let friesItemId: string;
  let sandwichItemId: string;
  let garlicBreadItemId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Offers Test Cafe");
    tenantId = t.tenant.id;
    outletId = t.outlet.id;
    token = t.token;

    const category = await prisma.menuCategory.create({ data: { tenantId, outletId, name: pizzaCategoryName } });
    const pizza = await prisma.menuItem.create({ data: { tenantId, outletId, categoryId: category.id, name: "Margherita", price: 200 } });
    pizzaItemId = pizza.id;
    const burger = await prisma.menuItem.create({ data: { tenantId, outletId, categoryId: category.id, name: "Makhni Burger", price: 150 } });
    burgerItemId = burger.id;
    const fries = await prisma.menuItem.create({ data: { tenantId, outletId, categoryId: category.id, name: "Fries", price: 90 } });
    friesItemId = fries.id;
    const sandwich = await prisma.menuItem.create({ data: { tenantId, outletId, categoryId: category.id, name: "Paneer Sandwich", price: 110 } });
    sandwichItemId = sandwich.id;
    const garlicBread = await prisma.menuItem.create({ data: { tenantId, outletId, categoryId: category.id, name: "Stuffed Garlic Bread", price: 130 } });
    garlicBreadItemId = garlicBread.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("creates a bogo offer (buy 1 pizza get 1 free)", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Buy 1 Pizza Get 1 Free",
      type: "bogo",
      triggerCategory: pizzaCategoryName,
      buyQty: 1,
      freeQty: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("bogo");
    expect(res.body.active).toBe(true);
  });

  it("rejects a bogo offer without a trigger or quantities", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Broken BOGO",
      type: "bogo",
    });
    expect(res.status).toBe(400);
  });

  it("creates a threshold_freebie offer (buy burger, get fries free)", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Burger -> Free Fries",
      type: "threshold_freebie",
      triggerItemId: burgerItemId,
      freeItemId: friesItemId,
    });
    expect(res.status).toBe(201);
    expect(res.body.freeItemId).toBe(friesItemId);
  });

  it("rejects a threshold_freebie offer without a free item", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Broken Freebie",
      type: "threshold_freebie",
      triggerItemId: burgerItemId,
    });
    expect(res.status).toBe(400);
  });

  it("creates a combo offer (sandwich + garlic bread at a fixed price)", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Sandwich + Garlic Bread Combo",
      type: "combo",
      comboItemIds: [sandwichItemId, garlicBreadItemId],
      comboPrice: 190,
    });
    expect(res.status).toBe(201);
    expect(res.body.comboPrice).toBe(190);
    expect(res.body.comboItemIds).toEqual([sandwichItemId, garlicBreadItemId]);
  });

  it("rejects a combo offer with fewer than 2 items", async () => {
    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Broken Combo",
      type: "combo",
      comboItemIds: [sandwichItemId],
      comboPrice: 100,
    });
    expect(res.status).toBe(400);
  });

  it("lists all offers for the tenant's outlet", async () => {
    const res = await request(app).get("/api/offers").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it("toggles an offer's active state", async () => {
    const list = await request(app).get("/api/offers").set("Authorization", `Bearer ${token}`);
    const offer = list.body[0];

    const off = await request(app).patch(`/api/offers/${offer.id}`).set("Authorization", `Bearer ${token}`).send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.active).toBe(false);

    const on = await request(app).patch(`/api/offers/${offer.id}`).set("Authorization", `Bearer ${token}`).send({ active: true });
    expect(on.body.active).toBe(true);
  });

  it("deletes an offer", async () => {
    const created = await request(app).post("/api/offers").set("Authorization", `Bearer ${token}`).send({
      name: "Temp Offer",
      type: "combo",
      comboItemIds: [pizzaItemId, burgerItemId],
      comboPrice: 300,
    });
    const del = await request(app).delete(`/api/offers/${created.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);

    const gone = await prisma.offer.findUnique({ where: { id: created.body.id } });
    expect(gone).toBeNull();
  });

  it("404s patching an offer from another tenant", async () => {
    const other = await createTenantWithAdmin("Other Offers Cafe");
    const otherOffer = await prisma.offer.create({
      data: { tenantId: other.tenant.id, outletId: other.outlet.id, name: "Other Offer", type: "bogo", triggerItemId: "x", buyQty: 1, freeQty: 1 },
    });

    const res = await request(app).patch(`/api/offers/${otherOffer.id}`).set("Authorization", `Bearer ${token}`).send({ active: false });
    expect(res.status).toBe(404);

    await deleteTenant(other.tenant.id);
  });
});
