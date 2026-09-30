import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("bulk expense entry", () => {
  let ctx: Awaited<ReturnType<typeof createTenantWithAdmin>>;

  beforeAll(async () => {
    ctx = await createTenantWithAdmin("Expense Bulk");
  });

  afterAll(async () => {
    await deleteTenant(ctx.tenant.id);
    await prisma.$disconnect();
  });

  it("saves only the rows with a reason and a positive amount", async () => {
    const res = await request(app)
      .post("/api/expenses/bulk")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({
        rows: [
          { category: "Milk", amount: 120, notes: "Morning delivery", employeeName: "Ravi", method: "Cash" },
          { category: "", amount: 500 }, // no reason — dropped
          { category: "Rent", amount: 0 }, // zero amount — dropped
          { category: "Electricity", amount: "" }, // blank amount — dropped
          { category: "Petrol", amount: 300, employeeName: "Sunil", method: "Bank Transfer" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);

    const saved = await prisma.expense.findMany({ where: { tenantId: ctx.tenant.id }, orderBy: { amount: "asc" } });
    expect(saved).toHaveLength(2);
    expect(saved[0].category).toBe("Milk");
    expect(saved[0].employeeName).toBe("Ravi");
    expect(saved[1].category).toBe("Petrol");
    expect(saved[1].method).toBe("Bank Transfer");
  });

  it("rejects a bulk save with no valid rows", async () => {
    const res = await request(app)
      .post("/api/expenses/bulk")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ rows: [{ category: "", amount: 100 }, { category: "Gas", amount: 0 }] });
    expect(res.status).toBe(400);
  });
});
