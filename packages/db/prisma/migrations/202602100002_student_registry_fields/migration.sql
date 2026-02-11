CREATE TYPE "Subjects" AS ENUM ('CHEMISTRY', 'BIOLOGY', 'BOTH');
CREATE TYPE "PersonType" AS ENUM (
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'COURSE_1',
  'COURSE_2',
  'ABITURIYENT',
  'TALABA',
  'OQITUVCHI'
);
CREATE TYPE "AvailabilityDays" AS ENUM ('DU_CHOR_JU', 'SE_PAY_SHAN', 'FARQI_YOQ');

ALTER TABLE "Student"
  ADD COLUMN "subjects" "Subjects",
  ADD COLUMN "chemistryLevel" INTEGER,
  ADD COLUMN "biologyLevel" INTEGER,
  ADD COLUMN "personType" "PersonType",
  ADD COLUMN "availabilityDays" "AvailabilityDays",
  ADD COLUMN "availabilityTime" TEXT,
  ADD COLUMN "note" TEXT;

ALTER TABLE "Student"
  ADD CONSTRAINT "Student_chemistryLevel_check"
  CHECK ("chemistryLevel" IS NULL OR ("chemistryLevel" >= 1 AND "chemistryLevel" <= 4));

ALTER TABLE "Student"
  ADD CONSTRAINT "Student_biologyLevel_check"
  CHECK ("biologyLevel" IS NULL OR ("biologyLevel" >= 1 AND "biologyLevel" <= 4));
