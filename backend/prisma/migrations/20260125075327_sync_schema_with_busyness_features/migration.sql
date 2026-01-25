-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "busy_patterns" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "live_metrics" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "FacilitySignal" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitySignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilitySignal_facilityId_timestamp_idx" ON "FacilitySignal"("facilityId", "timestamp");

-- AddForeignKey
ALTER TABLE "FacilitySignal" ADD CONSTRAINT "FacilitySignal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
