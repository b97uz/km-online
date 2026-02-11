DO $$ BEGIN
  CREATE TYPE "AppealSenderType" AS ENUM ('STUDENT', 'PARENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ParentContact" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentContact_phone_key" ON "ParentContact"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentContact_telegramUserId_key" ON "ParentContact"("telegramUserId");

CREATE TABLE IF NOT EXISTS "Appeal" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "senderType" "AppealSenderType" NOT NULL,
  "senderTelegramUserId" TEXT NOT NULL,
  "senderPhone" TEXT,
  "text" TEXT NOT NULL,
  "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Appeal_studentId_createdAt_idx" ON "Appeal"("studentId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Appeal"
    ADD CONSTRAINT "Appeal_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appeal"
    ADD CONSTRAINT "Appeal_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
