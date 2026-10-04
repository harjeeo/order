ALTER TYPE "NotificationChannel" ADD VALUE 'whatsapp';

ALTER TABLE "PlatformSettings"
  ADD COLUMN "whatsappSettings" JSONB NOT NULL DEFAULT '{"enabled":false,"phoneNumberId":"","accessToken":"","templateName":"bill_receipt","languageCode":"en"}';
