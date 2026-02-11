DO $$
BEGIN
  CREATE TYPE "CuratorWorkDays" AS ENUM ('DU_CHOR_JU', 'SE_PAY_SHAN', 'HAR_KUNI');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CuratorProfile"
  ADD COLUMN IF NOT EXISTS "workDays" "CuratorWorkDays" NOT NULL DEFAULT 'HAR_KUNI';
