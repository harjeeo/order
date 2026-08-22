import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireTenant, requireOutlet } from "../middleware/auth";

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth, requireTenant, requireOutlet);

reservationsRouter.get("/", async (req, res) => {
  const { status } = req.query as { status?: string };
  const reservations = await prisma.reservation.findMany({
    where: { outletId: req.outletId!, ...(status && status !== "all" ? { status: status as any } : {}) },
    include: { table: true },
    orderBy: { reservedFor: "asc" },
  });
  res.json(reservations);
});

const createReservationSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().default(""),
  partySize: z.number().int().positive(),
  reservedFor: z.string().datetime(),
  tableId: z.string().nullable().optional(),
  notes: z.string().default(""),
});

reservationsRouter.post("/", async (req, res) => {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

  const tenantId = req.user!.tenantId!;
  const outletId = req.outletId!;
  const { reservedFor, tableId, ...data } = parsed.data;

  if (tableId) {
    const table = await prisma.table.findFirst({ where: { id: tableId, outletId } });
    if (!table) return res.status(404).json({ error: "Table not found" });
  }

  const reservation = await prisma.reservation.create({
    data: { ...data, tenantId, outletId, tableId: tableId ?? null, reservedFor: new Date(reservedFor) },
    include: { table: true },
  });
  res.status(201).json(reservation);
});

reservationsRouter.patch("/:id/status", async (req, res) => {
  const outletId = req.outletId!;
  const existing = await prisma.reservation.findFirst({ where: { id: req.params.id, outletId } });
  if (!existing) return res.status(404).json({ error: "Reservation not found" });

  const reservation = await prisma.reservation.update({
    where: { id: existing.id },
    data: { status: req.body.status },
    include: { table: true },
  });

  // Seating a reservation with an assigned table occupies it, same as
  // opening the table manually from the Tables page.
  if (reservation.status === "seated" && reservation.tableId) {
    await prisma.table.update({ where: { id: reservation.tableId }, data: { status: "occupied" } });
  }

  res.json(reservation);
});
