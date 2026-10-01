ALTER TABLE "DayEndClosing" ADD COLUMN "cashTopUps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DayEndClosing" ADD COLUMN "cashWithdrawals" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "CashMovementType" AS ENUM ('topup', 'withdrawal');

CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashMovement_tenantId_idx" ON "CashMovement"("tenantId");
CREATE INDEX "CashMovement_outletId_idx" ON "CashMovement"("outletId");

ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
