-- Update the column default for future PlatformSettings rows, and update
-- the existing row(s) so the change is reflected immediately instead of
-- only applying to a fresh install.
ALTER TABLE "PlatformSettings" ALTER COLUMN "planPricing" SET DEFAULT '{"Free":0,"Basic":499,"Pro":1999}';

UPDATE "PlatformSettings"
SET "planPricing" = '{"Free":0,"Basic":499,"Pro":1999}'
WHERE "planPricing" = '{"Free":0,"Basic":999,"Pro":2499}';
