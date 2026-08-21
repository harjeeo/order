-- CreateEnum
CREATE TYPE "PrintLogType" AS ENUM ('kot', 'invoice');

-- CreateEnum
CREATE TYPE "PrintLogAction" AS ENUM ('print', 'reprint', 'download');

-- CreateTable
CREATE TABLE "PrintLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "PrintLogType" NOT NULL,
    "action" "PrintLogAction" NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintLog_tenantId_idx" ON "PrintLog"("tenantId");

-- AddForeignKey
ALTER TABLE "PrintLog" ADD CONSTRAINT "PrintLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
