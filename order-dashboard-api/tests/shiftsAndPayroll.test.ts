import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("shifts / attendance", () => {
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Shift Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("has no active shift before clocking in", async () => {
    const res = await request(app).get("/api/shifts/me/active").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("clocks in and reflects it as the active shift", async () => {
    const clockInRes = await request(app).post("/api/shifts/clock-in").set("Authorization", `Bearer ${token}`);
    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.clockOut).toBeNull();

    const activeRes = await request(app).get("/api/shifts/me/active").set("Authorization", `Bearer ${token}`);
    expect(activeRes.body.id).toBe(clockInRes.body.id);
  });

  it("rejects clocking in again while already clocked in", async () => {
    const res = await request(app).post("/api/shifts/clock-in").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it("clocks out and clears the active shift", async () => {
    const res = await request(app).post("/api/shifts/clock-out").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.clockOut).not.toBeNull();

    const activeRes = await request(app).get("/api/shifts/me/active").set("Authorization", `Bearer ${token}`);
    expect(activeRes.body).toBeNull();
  });

  it("rejects clocking out when not clocked in", async () => {
    const res = await request(app).post("/api/shifts/clock-out").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it("lists the shift in tenant attendance history", async () => {
    const res = await request(app).get("/api/shifts").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).toHaveProperty("user");
  });
});

describe("payroll: fixed monthly salary", () => {
  let tenantId: string;
  let token: string;
  let staffId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Payroll Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    const staffRes = await request(app)
      .post("/api/staff")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Payroll Staff", email: `payroll-staff-${Date.now()}@example.test`, password: "password123", role: "WAITER" });
    staffId = staffRes.body.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("rejects paying salary before one is set", async () => {
    const res = await request(app).post(`/api/staff/${staffId}/pay-salary`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("sets a monthly salary via the generic staff PATCH", async () => {
    const res = await request(app)
      .patch(`/api/staff/${staffId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ monthlySalary: 25000 });
    expect(res.status).toBe(200);

    const listRes = await request(app).get("/api/staff").set("Authorization", `Bearer ${token}`);
    const staff = listRes.body.find((s: any) => s.id === staffId);
    expect(staff.monthlySalary).toBe(25000);
  });

  it("pays the salary and logs it as a Salary expense", async () => {
    const res = await request(app).post(`/api/staff/${staffId}/pay-salary`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.lastSalaryPaidAt).not.toBeNull();

    const expenses = await prisma.expense.findMany({ where: { tenantId, category: "Salary" } });
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(25000);
  });

  it("rejects paying the same staff member twice in the same month", async () => {
    const res = await request(app).post(`/api/staff/${staffId}/pay-salary`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already paid/i);
  });
});
