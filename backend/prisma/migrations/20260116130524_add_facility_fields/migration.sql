-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "is_24_7" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialized_services" TEXT[] DEFAULT ARRAY[]::TEXT[];
