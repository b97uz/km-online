DO $$ BEGIN
  CREATE TYPE "JournalAttendance" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "GroupJournalDate" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "journalDate" TIMESTAMP(3) NOT NULL,
  "monthKey" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupJournalDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupJournalEntry" (
  "id" TEXT NOT NULL,
  "journalDateId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "attendance" "JournalAttendance" NOT NULL DEFAULT 'PRESENT',
  "lessonId" TEXT,
  "theoryScore" INTEGER,
  "practicalScore" INTEGER,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupJournalDate_groupId_journalDate_key"
  ON "GroupJournalDate"("groupId", "journalDate");

CREATE INDEX IF NOT EXISTS "GroupJournalDate_groupId_monthKey_journalDate_idx"
  ON "GroupJournalDate"("groupId", "monthKey", "journalDate");

CREATE UNIQUE INDEX IF NOT EXISTS "GroupJournalEntry_journalDateId_studentId_key"
  ON "GroupJournalEntry"("journalDateId", "studentId");

CREATE INDEX IF NOT EXISTS "GroupJournalEntry_studentId_journalDateId_idx"
  ON "GroupJournalEntry"("studentId", "journalDateId");

DO $$ BEGIN
  ALTER TABLE "GroupJournalDate"
    ADD CONSTRAINT "GroupJournalDate_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "GroupCatalog"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupJournalEntry"
    ADD CONSTRAINT "GroupJournalEntry_journalDateId_fkey"
    FOREIGN KEY ("journalDateId") REFERENCES "GroupJournalDate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupJournalEntry"
    ADD CONSTRAINT "GroupJournalEntry_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupJournalEntry"
    ADD CONSTRAINT "GroupJournalEntry_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
