-- Invoices and Expenses were tenant-scoped only, so switching outlets in
-- the UI showed billing/expense data from every outlet instead of just the
-- selected one (unlike orders/menu/inventory, which were already outlet-scoped).

-- Invoice: backfill from its Order's outletId (every invoice has one order).
ALTER TABLE "Invoice" ADD COLUMN "outletId" TEXT;
UPDATE "Invoice" i SET "outletId" = o."outletId" FROM "Order" o WHERE o.id = i."orderId";
ALTER TABLE "Invoice" ALTER COLUMN "outletId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Invoice_outletId_idx" ON "Invoice"("outletId");

-- Expense: no per-row outlet to derive from, so existing rows backfill to
-- each tenant's default outlet (new expenses are recorded against whichever
-- outlet is selected at creation time).
ALTER TABLE "Expense" ADD COLUMN "outletId" TEXT;
UPDATE "Expense" e SET "outletId" = (
  SELECT o.id FROM "Outlet" o WHERE o."tenantId" = e."tenantId" ORDER BY o."isDefault" DESC, o."createdAt" ASC LIMIT 1
);
ALTER TABLE "Expense" ALTER COLUMN "outletId" SET NOT NULL;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Expense_outletId_idx" ON "Expense"("outletId");
