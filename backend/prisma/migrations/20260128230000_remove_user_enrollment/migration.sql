-- Drop indexes tied to the legacy enrollment table
DROP INDEX IF EXISTS "UserEnrollment_user_id_key";
DROP INDEX IF EXISTS "UserEnrollment_phone_number_key";
DROP INDEX IF EXISTS "UserEnrollment_user_id_idx";
DROP INDEX IF EXISTS "UserEnrollment_phone_number_idx";
DROP INDEX IF EXISTS "UserEnrollment_username_key";
DROP INDEX IF EXISTS "ClinicalHistory_userEnrollmentId_idx";

-- Remove the old foreign key before renaming the column
ALTER TABLE "ClinicalHistory" DROP CONSTRAINT IF EXISTS "ClinicalHistory_userEnrollmentId_fkey";

-- Rename the table and drop columns that no longer belong on health profiles
ALTER TABLE "UserEnrollment" RENAME TO "HealthProfile";
ALTER INDEX "UserEnrollment_userId_key" RENAME TO "HealthProfile_userId_key";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "username";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "phone_number";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "enrollment_pathway";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "progress_step";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "completed";
ALTER TABLE "HealthProfile" DROP COLUMN IF EXISTS "documents_uploaded";

-- Point clinical history at the renamed table
ALTER TABLE "ClinicalHistory" RENAME COLUMN "userEnrollmentId" TO "healthProfileId";

-- Recreate the supporting index and foreign key
CREATE INDEX "ClinicalHistory_healthProfileId_idx" ON "ClinicalHistory"("healthProfileId");
ALTER TABLE "ClinicalHistory"
  ADD CONSTRAINT "ClinicalHistory_healthProfileId_fkey"
  FOREIGN KEY ("healthProfileId") REFERENCES "HealthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthProfile" RENAME CONSTRAINT "UserEnrollment_userId_fkey" TO "HealthProfile_userId_fkey";
