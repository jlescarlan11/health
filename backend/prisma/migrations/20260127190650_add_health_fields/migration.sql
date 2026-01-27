/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `UserEnrollment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `UserEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserEnrollment" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ClinicalHistory" (
    "id" TEXT NOT NULL,
    "userEnrollmentId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalHistory_userEnrollmentId_idx" ON "ClinicalHistory"("userEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEnrollment_username_key" ON "UserEnrollment"("username");

-- AddForeignKey
ALTER TABLE "ClinicalHistory" ADD CONSTRAINT "ClinicalHistory_userEnrollmentId_fkey" FOREIGN KEY ("userEnrollmentId") REFERENCES "UserEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
