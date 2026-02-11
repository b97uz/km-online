ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_isDeleted_month_idx" ON "Payment"("isDeleted", "month");
