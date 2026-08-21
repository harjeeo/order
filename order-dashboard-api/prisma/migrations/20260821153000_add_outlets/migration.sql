-- Outlet / multi-branch support --------------------------------------

CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Outlet_tenantId_idx" ON "Outlet"("tenantId");

ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One default "Main Outlet" per existing tenant, so existing data has
-- somewhere to backfill into.
INSERT INTO "Outlet" ("id", "tenantId", "name", "isDefault")
SELECT 'outlet_' || substr(md5(random()::text || "id"), 1, 20), "id", 'Main Outlet', true
FROM "Tenant";

-- MenuCategory -----------------------------------------------------------
ALTER TABLE "MenuCategory" ADD COLUMN "outletId" TEXT;
UPDATE "MenuCategory" c SET "outletId" = (SELECT o."id" FROM "Outlet" o WHERE o."tenantId" = c."tenantId" LIMIT 1);
ALTER TABLE "MenuCategory" ALTER COLUMN "outletId" SET NOT NULL;
DROP INDEX "MenuCategory_tenantId_name_key";
CREATE UNIQUE INDEX "MenuCategory_outletId_name_key" ON "MenuCategory"("outletId", "name");
CREATE INDEX "MenuCategory_tenantId_idx" ON "MenuCategory"("tenantId");
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MenuItem -----------------------------------------------------------
ALTER TABLE "MenuItem" ADD COLUMN "outletId" TEXT;
UPDATE "MenuItem" m SET "outletId" = (SELECT o."id" FROM "Outlet" o WHERE o."tenantId" = m."tenantId" LIMIT 1);
ALTER TABLE "MenuItem" ALTER COLUMN "outletId" SET NOT NULL;
CREATE INDEX "MenuItem_outletId_idx" ON "MenuItem"("outletId");
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Table ----------------------------------------------------------------
ALTER TABLE "Table" ADD COLUMN "outletId" TEXT;
UPDATE "Table" t SET "outletId" = (SELECT o."id" FROM "Outlet" o WHERE o."tenantId" = t."tenantId" LIMIT 1);
ALTER TABLE "Table" ALTER COLUMN "outletId" SET NOT NULL;
CREATE INDEX "Table_outletId_idx" ON "Table"("outletId");
ALTER TABLE "Table" ADD CONSTRAINT "Table_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ingredient -------------------------------------------------------------
ALTER TABLE "Ingredient" ADD COLUMN "outletId" TEXT;
UPDATE "Ingredient" i SET "outletId" = (SELECT o."id" FROM "Outlet" o WHERE o."tenantId" = i."tenantId" LIMIT 1);
ALTER TABLE "Ingredient" ALTER COLUMN "outletId" SET NOT NULL;
CREATE INDEX "Ingredient_outletId_idx" ON "Ingredient"("outletId");
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order ------------------------------------------------------------------
ALTER TABLE "Order" ADD COLUMN "outletId" TEXT;
UPDATE "Order" ord SET "outletId" = (SELECT o."id" FROM "Outlet" o WHERE o."tenantId" = ord."tenantId" LIMIT 1);
ALTER TABLE "Order" ALTER COLUMN "outletId" SET NOT NULL;
CREATE INDEX "Order_outletId_idx" ON "Order"("outletId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
