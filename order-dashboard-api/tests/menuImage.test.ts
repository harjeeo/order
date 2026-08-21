import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

function fakeBase64Image(mimeType: string, approxBytes: number) {
  // Each base64 char encodes 6 bits; 4 chars ~= 3 decoded bytes.
  const charCount = Math.ceil((approxBytes * 4) / 3);
  return `data:image/${mimeType};base64,${"A".repeat(charCount)}`;
}

describe("menu item image validation", () => {
  let tenantId: string;
  let token: string;
  let categoryId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Menu Image Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
    const category = await prisma.menuCategory.create({ data: { tenantId, name: "Test Category" } });
    categoryId = category.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("accepts a small, allowed-type image", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Small Photo Item", categoryId, price: 100, image: fakeBase64Image("png", 10_000) });
    expect(res.status).toBe(201);
  });

  it("rejects an image over the decoded size cap", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Huge Photo Item", categoryId, price: 100, image: fakeBase64Image("png", 2 * 1024 * 1024) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/i);
  });

  it("rejects an unsupported image type", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "SVG Item", categoryId, price: 100, image: fakeBase64Image("svg+xml", 1000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported image type/i);
  });

  it("leaves plain emoji images untouched", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Emoji Item", categoryId, price: 100, image: "🍕" });
    expect(res.status).toBe(201);
    expect(res.body.image).toBe("🍕");
  });

  it("also validates the image on update (PATCH)", async () => {
    const created = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Update Target Item", categoryId, price: 100 });

    const res = await request(app)
      .patch(`/api/menu/items/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image: fakeBase64Image("bmp", 2 * 1024 * 1024) });
    expect(res.status).toBe(400);
  });

  it("rejects a request body over the outer JSON size limit with a clean 413", async () => {
    const res = await request(app)
      .post("/api/menu/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Oversized Body Item", categoryId, price: 100, image: fakeBase64Image("png", 5 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });
});
