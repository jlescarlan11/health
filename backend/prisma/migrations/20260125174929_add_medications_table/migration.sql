-- AlterTable
ALTER TABLE "FacilityContact" ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'phone',
ADD COLUMN     "teleconsultUrl" TEXT;

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "scheduled_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "days_of_week" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_name_idx" ON "Medication"("name");
