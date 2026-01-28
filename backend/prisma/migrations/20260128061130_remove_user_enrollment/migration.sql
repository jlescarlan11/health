/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserEnrollment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `UserEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserEnrollment" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserEnrollment_userId_key" ON "UserEnrollment"("userId");

-- CreateIndex
CREATE INDEX "Medication_userId_idx" ON "Medication"("userId");

-- AddForeignKey
ALTER TABLE "UserEnrollment" ADD CONSTRAINT "UserEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
