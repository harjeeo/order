import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

describe("table reservations", () => {
  let tenantId: string;
  let token: string;
  let tableId: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Reservations Test Cafe");
    tenantId = t.tenant.id;
    token = t.token;

    const table = await prisma.table.create({ data: { tenantId, outletId: t.outlet.id, number: "R1", capacity: 4 } });
    tableId = table.id;
  });

  afterAll(async () => {
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  it("creates a reservation for a future time", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerName: "Priya Sharma",
        phone: "9876543210",
        partySize: 4,
        reservedFor: new Date(Date.now() + 3600000).toISOString(),
        tableId,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("booked");
    expect(res.body.table.number).toBe("R1");
  });

  it("rejects a reservation for a table from a different outlet/tenant", async () => {
    const other = await createTenantWithAdmin("Other Reservation Cafe");
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "X", partySize: 2, reservedFor: new Date().toISOString(), tableId: other.tenant.id });
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });

  it("lists reservations ordered by time", async () => {
    const res = await request(app).get("/api/reservations").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("marking a reservation seated occupies its table", async () => {
    const listRes = await request(app).get("/api/reservations").set("Authorization", `Bearer ${token}`);
    const reservation = listRes.body[0];

    const res = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "seated" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("seated");

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    expect(table?.status).toBe("occupied");
  });

  it("filters reservations by status", async () => {
    const res = await request(app).get("/api/reservations?status=seated").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.status === "seated")).toBe(true);
  });

  it("404s updating a reservation from a different tenant", async () => {
    const other = await createTenantWithAdmin("Other Reservation Cafe 2");
    const listRes = await request(app).get("/api/reservations").set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .patch(`/api/reservations/${listRes.body[0].id}/status`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ status: "cancelled" });
    expect(res.status).toBe(404);
    await deleteTenant(other.tenant.id);
  });
});
