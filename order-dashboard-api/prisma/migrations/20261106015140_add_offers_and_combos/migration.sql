-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('bogo', 'threshold_freebie', 'combo');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerCategory" TEXT,
    "triggerItemId" TEXT,
    "minTriggerPrice" INTEGER,
    "buyQty" INTEGER,
    "freeQty" INTEGER,
    "freeItemId" TEXT,
    "comboItemIds" JSONB,
    "comboPrice" INTEGER,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_tenantId_idx" ON "Offer"("tenantId");

-- CreateIndex
CREATE INDEX "Offer_outletId_idx" ON "Offer"("outletId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
