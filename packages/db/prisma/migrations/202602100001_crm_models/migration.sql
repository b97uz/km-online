CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'BLOCKED');
CREATE TYPE "GroupCatalogStatus" AS ENUM ('REJADA', 'OCHIQ', 'BOSHLANGAN', 'YOPIQ');
CREATE TYPE "GroupCatalogFormat" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'LEFT');

CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "parentPhone" TEXT,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCatalog" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "fan" TEXT NOT NULL,
  "scheduleText" TEXT NOT NULL,
  "days" TEXT,
  "time" TEXT,
  "format" "GroupCatalogFormat" NOT NULL DEFAULT 'ONLINE',
  "capacity" INTEGER NOT NULL,
  "priceMonthly" INTEGER NOT NULL,
  "status" "GroupCatalogStatus" NOT NULL DEFAULT 'REJADA',
  "curatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_phone_key" ON "Student"("phone");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE INDEX "Student_phone_status_idx" ON "Student"("phone", "status");

CREATE UNIQUE INDEX "GroupCatalog_code_key" ON "GroupCatalog"("code");
CREATE INDEX "GroupCatalog_curatorId_status_idx" ON "GroupCatalog"("curatorId", "status");

CREATE UNIQUE INDEX "Enrollment_studentId_groupId_key" ON "Enrollment"("studentId", "groupId");
CREATE INDEX "Enrollment_groupId_status_idx" ON "Enrollment"("groupId", "status");
CREATE INDEX "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");

ALTER TABLE "Student"
  ADD CONSTRAINT "Student_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupCatalog"
  ADD CONSTRAINT "GroupCatalog_curatorId_fkey"
  FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "GroupCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
