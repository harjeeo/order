import bcrypt from "bcryptjs";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

export async function createTenantWithAdmin(namePrefix: string, password = "password123") {
  const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const tenant = await prisma.tenant.create({
    data: { name: `${namePrefix} ${suffix}`, ownerName: "Test Owner" },
  });
  const email = `admin-${suffix}@example.test`;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { tenantId: tenant.id, name: "Test Admin", email, passwordHash, role: "ADMIN" },
  });

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  const token: string = loginRes.body.token;

  return { tenant, email, token };
}

export async function deleteTenant(tenantId: string) {
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
}
