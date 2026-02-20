DO $$ BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'UZUM';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYNET';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('PAYME', 'CLICK', 'UZUM', 'PAYNET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Enrollment"
  ADD COLUMN IF NOT EXISTS "studyStartDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PaymentCheckout" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "groupId" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PaymentCheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "studentCode" TEXT NOT NULL,
  "callbackToken" TEXT NOT NULL,
  "externalTxnId" TEXT,
  "externalStatus" TEXT,
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentCheckout_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PaymentCheckout"
    ADD CONSTRAINT "PaymentCheckout_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentCheckout"
    ADD CONSTRAINT "PaymentCheckout_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "GroupCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentCheckout"
    ADD CONSTRAINT "PaymentCheckout_amount_check"
    CHECK ("amount" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCheckout_callbackToken_key" ON "PaymentCheckout"("callbackToken");
CREATE INDEX IF NOT EXISTS "PaymentCheckout_studentId_status_createdAt_idx" ON "PaymentCheckout"("studentId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentCheckout_groupId_status_createdAt_idx" ON "PaymentCheckout"("groupId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentCheckout_externalTxnId_idx" ON "PaymentCheckout"("externalTxnId");
