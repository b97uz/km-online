-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CURATOR', 'STUDENT');
CREATE TYPE "GroupStudentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SUBMIT');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "role" "Role" NOT NULL,
  "phone" TEXT UNIQUE,
  "username" TEXT UNIQUE,
  "passwordHash" TEXT,
  "telegramUserId" TEXT UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CuratorProfile" (
  "userId" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CuratorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Group" (
  "id" TEXT PRIMARY KEY,
  "curatorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "scheduleText" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Group_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Group_curatorId_idx" ON "Group"("curatorId");

CREATE TABLE "GroupStudent" (
  "groupId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "GroupStudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("groupId", "studentId"),
  CONSTRAINT "GroupStudent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GroupStudent_studentId_idx" ON "GroupStudent"("studentId");

CREATE TABLE "Book" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Lesson" (
  "id" TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL,
  "lessonNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lesson_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Lesson_bookId_lessonNumber_key" ON "Lesson"("bookId", "lessonNumber");

CREATE TABLE "Test" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "answerKey" JSONB NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Test_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Test_lessonId_isActive_idx" ON "Test"("lessonId", "isActive");

CREATE TABLE "TestImage" (
  "id" TEXT PRIMARY KEY,
  "testId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  CONSTRAINT "TestImage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TestImage_testId_pageNumber_key" ON "TestImage"("testId", "pageNumber");

CREATE TABLE "AccessWindow" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "openFrom" TIMESTAMP(3) NOT NULL,
  "openTo" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessWindow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessWindow_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessWindow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccessWindow_studentId_isActive_openFrom_openTo_idx" ON "AccessWindow"("studentId", "isActive", "openFrom", "openTo");
CREATE INDEX "AccessWindow_testId_idx" ON "AccessWindow"("testId");

CREATE TABLE "Submission" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "rawAnswerText" TEXT NOT NULL,
  "parsedAnswers" JSONB NOT NULL,
  "score" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Submission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Submission_studentId_createdAt_idx" ON "Submission"("studentId", "createdAt");
CREATE INDEX "Submission_testId_createdAt_idx" ON "Submission"("testId", "createdAt");

CREATE TABLE "SubmissionDetail" (
  "id" TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "questionNumber" INTEGER NOT NULL,
  "givenAnswer" TEXT,
  "correctAnswer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  CONSTRAINT "SubmissionDetail_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubmissionDetail_submissionId_questionNumber_key" ON "SubmissionDetail"("submissionId", "questionNumber");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
