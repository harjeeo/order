import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUniqueSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";

  // In production, the super admin's credentials must be supplied via env
  // vars — falling back to the well-known demo password would hand out an
  // admin login to anyone who's read this file. Dev/test keep the
  // zero-config demo default.
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "owner@orderdashboard.example";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (isProduction && !superAdminPassword) {
    throw new Error("SUPER_ADMIN_PASSWORD (and ideally SUPER_ADMIN_EMAIL) must be set when seeding in production.");
  }
  const resolvedSuperAdminPassword = superAdminPassword ?? "password123";
  if (!superAdminPassword) {
    console.warn(`[seed] SUPER_ADMIN_PASSWORD not set — using the well-known demo password. Change it after first login.`);
  }

  const platformSettings = await prisma.platformSettings.findFirst();
  if (!platformSettings) {
    await prisma.platformSettings.create({ data: {} });
  }

  const existingSuperAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        name: "Platform Owner",
        email: superAdminEmail,
        passwordHash: await bcrypt.hash(resolvedSuperAdminPassword, 10),
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Super admin created: ${superAdminEmail}${superAdminPassword ? "" : " / password123"}`);
  }

  // Demo tenant/staff/menu data is dev convenience only — skip it in
  // production seeding (opt back in with SEED_DEMO_DATA=true if you
  // genuinely want the sample cafe on a prod database).
  if (isProduction && process.env.SEED_DEMO_DATA !== "true") {
    console.log("[seed] Skipping demo tenant/menu data in production (set SEED_DEMO_DATA=true to force it).");
    return;
  }

  let tenant = await prisma.tenant.findFirst({ where: { name: "Tanvir's Cafe" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Tanvir's Cafe",
        slug: await generateUniqueSlug("Tanvir's Cafe"),
        ownerName: "Tanvir Singh",
        phone: "9876500000",
        email: "hello@tanvirscafe.example",
        address: "12 MG Road, Pune",
        plan: "Pro",
        planExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Demo tenant created: ${tenant.name}`);
  }

  const staffEmail = "staff@tanvirscafe.example";
  const existingStaff = await prisma.user.findUnique({ where: { email: staffEmail } });
  if (!existingStaff) {
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Cafe Admin",
        email: staffEmail,
        passwordHash: await bcrypt.hash("password123", 10),
        role: "ADMIN",
        permissions: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
      },
    });
    console.log(`Demo cafe staff created: ${staffEmail} / password123`);
  }

  await prisma.settings.upsert({ where: { tenantId: tenant.id }, update: {}, create: { tenantId: tenant.id } });

  let outlet = await prisma.outlet.findFirst({ where: { tenantId: tenant.id, isDefault: true } });
  if (!outlet) {
    outlet = await prisma.outlet.create({ data: { tenantId: tenant.id, name: "Main Outlet", isDefault: true } });
  }

  const categoryNames = ["Burgers", "Pizza", "Beverages", "Sandwiches", "Desserts"];
  for (const name of categoryNames) {
    await prisma.menuCategory.upsert({
      where: { outletId_name: { outletId: outlet.id, name } },
      update: {},
      create: { tenantId: tenant.id, outletId: outlet.id, name },
    });
  }

  const existingItems = await prisma.menuItem.count({ where: { tenantId: tenant.id } });
  if (existingItems === 0) {
    const burgers = await prisma.menuCategory.findFirstOrThrow({ where: { outletId: outlet.id, name: "Burgers" } });
    await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        outletId: outlet.id,
        categoryId: burgers.id,
        name: "Cheese Burger",
        image: "🍔",
        price: 179,
        tax: 5,
        variants: { create: [{ name: "Regular", price: 149 }, { name: "Cheese", price: 179 }, { name: "Double", price: 219 }] },
        addons: { create: [{ name: "Extra Cheese", price: 30 }] },
      },
    });

    const beverages = await prisma.menuCategory.findFirstOrThrow({ where: { outletId: outlet.id, name: "Beverages" } });
    await prisma.menuItem.create({
      data: { tenantId: tenant.id, outletId: outlet.id, categoryId: beverages.id, name: "Cappuccino", image: "☕", price: 110, tax: 5 },
    });
  }

  const existingTables = await prisma.table.count({ where: { tenantId: tenant.id } });
  if (existingTables === 0) {
    await prisma.table.createMany({
      data: [
        { tenantId: tenant.id, outletId: outlet.id, number: "T1", capacity: 2 },
        { tenantId: tenant.id, outletId: outlet.id, number: "T2", capacity: 4 },
        { tenantId: tenant.id, outletId: outlet.id, number: "T3", capacity: 4 },
      ],
    });
  }

  const existingIngredients = await prisma.ingredient.count({ where: { tenantId: tenant.id } });
  if (existingIngredients === 0) {
    await prisma.ingredient.createMany({
      data: [
        { tenantId: tenant.id, outletId: outlet.id, name: "Cheese", unit: "kg", stock: 5, minimum: 2 },
        { tenantId: tenant.id, outletId: outlet.id, name: "Coffee Beans", unit: "kg", stock: 1, minimum: 1 },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
