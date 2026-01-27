-- AlterTable
ALTER TABLE "UserEnrollment" ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "chronic_conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "current_medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "family_history" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "surgical_history" TEXT[] DEFAULT ARRAY[]::TEXT[];
