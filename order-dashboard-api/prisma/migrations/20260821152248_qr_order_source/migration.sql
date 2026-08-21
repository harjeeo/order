-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('staff', 'customer');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'staff';
