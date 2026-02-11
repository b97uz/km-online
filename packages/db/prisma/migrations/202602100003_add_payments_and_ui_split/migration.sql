CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PAYME', 'CLICK', 'BANK');
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'DEBT');

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "subject" "Subjects" NOT NULL,
  "month" TEXT NOT NULL,
  "amountRequired" INTEGER NOT NULL,
  "amountPaid" INTEGER NOT NULL,
  "discount" INTEGER NOT NULL DEFAULT 0,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_studentId_month_idx" ON "Payment"("studentId", "month");
CREATE INDEX "Payment_month_status_idx" ON "Payment"("month", "status");
CREATE INDEX "Payment_subject_status_idx" ON "Payment"("subject", "status");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amountRequired_check"
  CHECK ("amountRequired" >= 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amountPaid_check"
  CHECK ("amountPaid" >= 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_discount_check"
  CHECK ("discount" >= 0);
