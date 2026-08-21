-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "feedbackNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rating" INTEGER;
