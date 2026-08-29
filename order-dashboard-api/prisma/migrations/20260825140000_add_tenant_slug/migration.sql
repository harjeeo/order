-- Adds the public-menu-link slug (pos.getojar.com/menu/:slug) to Tenant.
-- Existing rows are backfilled from their name with the id's first 6 chars
-- appended for guaranteed uniqueness; new tenants get a clean slug (no id
-- suffix) from generateUniqueSlug() in application code.
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;

UPDATE "Tenant"
SET "slug" = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')) || '-' || substr(id, 1, 6);

ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
