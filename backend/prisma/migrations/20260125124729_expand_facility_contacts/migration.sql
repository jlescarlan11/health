/*
  Warnings:

  - You are about to drop the column `phone` on the `Facility` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "phone";

-- CreateTable
CREATE TABLE "FacilityContact" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "role" TEXT,
    "facilityId" TEXT NOT NULL,

    CONSTRAINT "FacilityContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityContact_facilityId_idx" ON "FacilityContact"("facilityId");

-- AddForeignKey
ALTER TABLE "FacilityContact" ADD CONSTRAINT "FacilityContact_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
