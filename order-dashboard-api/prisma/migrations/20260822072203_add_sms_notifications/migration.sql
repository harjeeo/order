-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('sms');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'logged');

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "smsSettings" JSONB NOT NULL DEFAULT '{"provider":"none","twilio":{"accountSid":"","authToken":"","fromNumber":""}}';

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
