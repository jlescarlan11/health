-- AlterTable
ALTER TABLE "AssessmentProfile" ADD COLUMN     "specific_details" JSONB;

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "updatedAt" DROP DEFAULT;
