import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("print log (audit trail for print/reprint/download)", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Print Log Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("records a print event and returns it in the list", async () => {
    const res = await request(app)
      .post("/api/print-log")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "kot", action: "print", refId: "order-123" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toEqual(expect.any(String));

    const listRes = await request(app).get("/api/print-log").set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0]).toMatchObject({ type: "kot", action: "print", refId: "order-123", tenantId });
  });

  it("rejects an invalid type/action", async () => {
    const res = await request(app)
      .post("/api/print-log")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "receipt", action: "print", refId: "x" });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/print-log").send({ type: "kot", action: "print", refId: "x" });
    expect(res.status).toBe(401);
  });
});
