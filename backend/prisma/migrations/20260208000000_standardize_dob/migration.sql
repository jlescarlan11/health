-- Standardize the stored date of birth format to PostgreSQL DATE
ALTER TABLE "User"
  ALTER COLUMN "dateOfBirth" TYPE DATE USING ("dateOfBirth"::DATE);

ALTER TABLE "User"
  ALTER COLUMN "dateOfBirth" SET NOT NULL;
