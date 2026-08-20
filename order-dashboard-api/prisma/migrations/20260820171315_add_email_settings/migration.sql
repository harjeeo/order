-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "emailSettings" JSONB NOT NULL DEFAULT '{"provider":"none","fromName":"Order Dashboard","fromEmail":"","mailjet":{"apiKey":"","apiSecret":""},"brevo":{"apiKey":""}}';
