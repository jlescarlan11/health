-- AlterTable
ALTER TABLE "UserEnrollment" ALTER COLUMN "family_history" DROP NOT NULL,
ALTER COLUMN "family_history" DROP DEFAULT,
ALTER COLUMN "family_history" SET DATA TYPE TEXT,
ALTER COLUMN "surgical_history" DROP NOT NULL,
ALTER COLUMN "surgical_history" DROP DEFAULT,
ALTER COLUMN "surgical_history" SET DATA TYPE TEXT;
