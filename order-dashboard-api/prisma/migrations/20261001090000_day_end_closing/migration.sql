CREATE TABLE "DayEndClosing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "successOrders" INTEGER NOT NULL DEFAULT 0,
    "successAmount" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledAmount" INTEGER NOT NULL DEFAULT 0,
    "complimentaryOrders" INTEGER NOT NULL DEFAULT 0,
    "complimentaryAmount" INTEGER NOT NULL DEFAULT 0,
    "salesReturnOrders" INTEGER NOT NULL DEFAULT 0,
    "salesReturnAmount" INTEGER NOT NULL DEFAULT 0,
    "dueOrders" INTEGER NOT NULL DEFAULT 0,
    "dueAmount" INTEGER NOT NULL DEFAULT 0,
    "expectedCash" INTEGER NOT NULL DEFAULT 0,
    "countedCash" INTEGER NOT NULL DEFAULT 0,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "closedBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayEndClosing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DayEndClosing_tenantId_idx" ON "DayEndClosing"("tenantId");
CREATE INDEX "DayEndClosing_outletId_idx" ON "DayEndClosing"("outletId");

ALTER TABLE "DayEndClosing" ADD CONSTRAINT "DayEndClosing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DayEndClosing" ADD CONSTRAINT "DayEndClosing_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
