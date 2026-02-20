ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "studentCode" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'S'
      AND relname = 'student_code_seq'
  ) THEN
    CREATE SEQUENCE student_code_seq START 1;
  END IF;
END $$;

DO $$
DECLARE
  v_max integer;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN "studentCode" ~ '^[0-9]+$' THEN CAST("studentCode" AS integer)
        ELSE NULL
      END
    ),
    0
  )
  INTO v_max
  FROM "Student";

  IF v_max > 0 THEN
    PERFORM setval('student_code_seq', v_max, true);
  ELSE
    PERFORM setval('student_code_seq', 1, false);
  END IF;
END $$;

UPDATE "Student"
SET "studentCode" = LPAD(nextval('student_code_seq')::text, 6, '0')
WHERE "studentCode" IS NULL OR BTRIM("studentCode") = '';

DO $$ BEGIN
  ALTER TABLE "Student"
    ALTER COLUMN "studentCode" SET NOT NULL;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Student_studentCode_key" ON "Student"("studentCode");

DO $$ BEGIN
  ALTER TABLE "Student"
    ADD CONSTRAINT "Student_studentCode_format_check"
    CHECK ("studentCode" ~ '^[0-9]{6}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

