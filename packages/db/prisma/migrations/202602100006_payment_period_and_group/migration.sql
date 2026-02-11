ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "groupId" TEXT,
  ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "GroupCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Payment_groupId_periodEnd_idx" ON "Payment"("groupId", "periodEnd");
