DO $$ BEGIN
  CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'LYCEUM_COLLEGE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InstitutionCatalogType" AS ENUM ('SCHOOL', 'LYCEUM_COLLEGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Province" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Province_name_key" ON "Province"("name");

CREATE TABLE IF NOT EXISTS "District" (
  "id" TEXT NOT NULL,
  "provinceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "District_provinceId_name_key" ON "District"("provinceId", "name");
CREATE INDEX IF NOT EXISTS "District_provinceId_idx" ON "District"("provinceId");

CREATE TABLE IF NOT EXISTS "Institution" (
  "id" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "type" "InstitutionCatalogType" NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Institution_districtId_type_name_key" ON "Institution"("districtId", "type", "name");
CREATE INDEX IF NOT EXISTS "Institution_districtId_type_idx" ON "Institution"("districtId", "type");

DO $$ BEGIN
  ALTER TABLE "District"
    ADD CONSTRAINT "District_provinceId_fkey"
    FOREIGN KEY ("provinceId") REFERENCES "Province"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Institution"
    ADD CONSTRAINT "Institution_districtId_fkey"
    FOREIGN KEY ("districtId") REFERENCES "District"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "provinceId" TEXT,
  ADD COLUMN IF NOT EXISTS "districtId" TEXT,
  ADD COLUMN IF NOT EXISTS "institutionType" "InstitutionType",
  ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
  ADD COLUMN IF NOT EXISTS "institutionName" TEXT;

CREATE INDEX IF NOT EXISTS "Student_provinceId_idx" ON "Student"("provinceId");
CREATE INDEX IF NOT EXISTS "Student_districtId_idx" ON "Student"("districtId");
CREATE INDEX IF NOT EXISTS "Student_institutionId_idx" ON "Student"("institutionId");

DO $$ BEGIN
  ALTER TABLE "Student"
    ADD CONSTRAINT "Student_provinceId_fkey"
    FOREIGN KEY ("provinceId") REFERENCES "Province"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Student"
    ADD CONSTRAINT "Student_districtId_fkey"
    FOREIGN KEY ("districtId") REFERENCES "District"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Student"
    ADD CONSTRAINT "Student_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
