-- Replaces the Free/Basic/Pro tenant plan tiers (never feature-differentiated
-- anywhere in the app) with a simple billing-cycle model: Free (trial),
-- Monthly, Yearly. Renaming the enum values preserves any tenant rows
-- already on "Basic"/"Pro" instead of requiring a data backfill.
ALTER TYPE "TenantPlan" RENAME VALUE 'Basic' TO 'Monthly';
ALTER TYPE "TenantPlan" RENAME VALUE 'Pro' TO 'Yearly';

ALTER TABLE "PlatformSettings" ALTER COLUMN "planPricing" SET DEFAULT '{"Free":0,"Monthly":499,"Yearly":4999}';

-- Rename the JSON keys too (planPricing is a plain jsonb blob, not tied to
-- the enum), preserving any price the Super Admin already customized rather
-- than overwriting it, and falling back to the new defaults if absent.
UPDATE "PlatformSettings"
SET "planPricing" = (
  ("planPricing" - 'Basic' - 'Pro')
  || jsonb_build_object('Monthly', COALESCE("planPricing"->'Basic', to_jsonb(499)))
  || jsonb_build_object('Yearly', COALESCE("planPricing"->'Pro', to_jsonb(4999)))
)
WHERE "planPricing" ? 'Basic' OR "planPricing" ? 'Pro';
