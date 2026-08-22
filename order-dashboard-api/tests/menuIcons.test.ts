import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

// A minimal valid 1x1 PNG, base64-encoded — small enough to pass the size
// cap, real enough to pass the data-URI/type check.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function createSuperAdmin() {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const email = `super-icons-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { name: "Test Super Admin", email, passwordHash, role: "SUPER_ADMIN" } });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

describe("menu icon library", () => {
  let superAdminToken: string;
  let tenantId: string;
  let staffToken: string;
  const createdIconIds: string[] = [];

  beforeAll(async () => {
    superAdminToken = await createSuperAdmin();
    const t = await createTenantWithAdmin("Menu Icons Test Cafe");
    tenantId = t.tenant.id;
    staffToken = t.token;
  });

  afterAll(async () => {
    await prisma.menuIcon.deleteMany({ where: { id: { in: createdIconIds } } }).catch(() => {});
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("rejects a cafe staff member creating an icon", async () => {
    const res = await request(app)
      .post("/api/menu-icons")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ name: "Burger", image: TINY_PNG });
    expect(res.status).toBe(403);
  });

  it("lets Super Admin create an icon", async () => {
    const res = await request(app)
      .post("/api/menu-icons")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Cheese Burger", image: TINY_PNG });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Cheese Burger");
    createdIconIds.push(res.body.id);
  });

  it("allows an SVG icon (unlike regular menu-item photo uploads)", async () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>").toString("base64")}`;
    const res = await request(app)
      .post("/api/menu-icons")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "SVG Icon", image: svg });
    expect(res.status).toBe(201);
    createdIconIds.push(res.body.id);
  });

  it("rejects an icon with no image", async () => {
    const res = await request(app)
      .post("/api/menu-icons")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "No Image" });
    expect(res.status).toBe(400);
  });

  it("cafe staff can list icons (read-only)", async () => {
    const res = await request(app).get("/api/menu-icons").set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((i: any) => i.name === "Cheese Burger")).toBe(true);
  });

  it("searches icons by name (case-insensitive)", async () => {
    const res = await request(app)
      .post("/api/menu-icons")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Iced Latte", image: TINY_PNG });
    createdIconIds.push(res.body.id);

    const search = await request(app).get("/api/menu-icons?search=latte").set("Authorization", `Bearer ${staffToken}`);
    expect(search.body).toHaveLength(1);
    expect(search.body[0].name).toBe("Iced Latte");
  });

  it("rejects a cafe staff member deleting an icon", async () => {
    const res = await request(app)
      .delete(`/api/menu-icons/${createdIconIds[0]}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("lets Super Admin delete an icon", async () => {
    const res = await request(app)
      .delete(`/api/menu-icons/${createdIconIds[0]}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/menu-icons").set("Authorization", `Bearer ${staffToken}`);
    expect(list.body.some((i: any) => i.id === createdIconIds[0])).toBe(false);
    createdIconIds.shift();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/menu-icons");
    expect(res.status).toBe(401);
  });
});
