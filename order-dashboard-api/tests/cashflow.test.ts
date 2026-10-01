import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("cash flow (till top-ups / withdrawals)", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;
  let other: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Cash Flow");
    other = await createTenantWithAdmin("Cash Flow Other");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await deleteTenant(other.tenant.id);
    await prisma.$disconnect();
  });

  it("records a top-up and a withdrawal", async () => {
    const topupRes = await request(app)
      .post("/api/cashflow")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ type: "topup", amount: 1000, reason: "opening float" });
    expect(topupRes.status).toBe(201);
    expect(topupRes.body.type).toBe("topup");
    expect(topupRes.body.amount).toBe(1000);
    expect(topupRes.body.createdBy).toBe("Test Admin");

    const withdrawalRes = await request(app)
      .post("/api/cashflow")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ type: "withdrawal", amount: 300, reason: "manager pickup" });
    expect(withdrawalRes.status).toBe(201);
    expect(withdrawalRes.body.type).toBe("withdrawal");
  });

  it("rejects an invalid type or a non-positive amount", async () => {
    const badType = await request(app)
      .post("/api/cashflow")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ type: "deposit", amount: 100 });
    expect(badType.status).toBe(400);

    const badAmount = await request(app)
      .post("/api/cashflow")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ type: "topup", amount: -50 });
    expect(badAmount.status).toBe(400);
  });

  it("lists and filters movements by type, scoped to the tenant", async () => {
    const allRes = await request(app).get("/api/cashflow").set("Authorization", `Bearer ${ctx.token}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.items.length).toBe(2);

    const topupOnly = await request(app).get("/api/cashflow?type=topup").set("Authorization", `Bearer ${ctx.token}`);
    expect(topupOnly.body.items.every((m: any) => m.type === "topup")).toBe(true);

    const otherTenantRes = await request(app).get("/api/cashflow").set("Authorization", `Bearer ${other.token}`);
    expect(otherTenantRes.body.items).toHaveLength(0);
  });

  it("deletes a movement, scoped to the owning tenant", async () => {
    const created = await request(app)
      .post("/api/cashflow")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ type: "topup", amount: 50 });
    const movementId = created.body.id;

    // Another tenant cannot delete it.
    await request(app).delete(`/api/cashflow/${movementId}`).set("Authorization", `Bearer ${other.token}`);
    const stillThere = await prisma.cashMovement.findUnique({ where: { id: movementId } });
    expect(stillThere).not.toBeNull();

    const deleteRes = await request(app)
      .delete(`/api/cashflow/${movementId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(deleteRes.status).toBe(200);
    const gone = await prisma.cashMovement.findUnique({ where: { id: movementId } });
    expect(gone).toBeNull();
  });
});
