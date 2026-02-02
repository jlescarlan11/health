-- Create the new enum definition with the updated values
CREATE TYPE "SexAtBirth_new" AS ENUM ('male', 'female', 'intersex', 'not_specified');

-- Re-map any deprecated values while transitioning the column type
ALTER TABLE "User"
ALTER COLUMN "sexAtBirth" TYPE "SexAtBirth_new"
USING CASE
  WHEN "sexAtBirth" = 'other' THEN 'not_specified'::text::"SexAtBirth_new"
  WHEN "sexAtBirth" = 'preferNotToSay' THEN 'not_specified'::text::"SexAtBirth_new"
  ELSE "sexAtBirth"::text::"SexAtBirth_new"
END;

-- Clean up the old enum
DROP TYPE "SexAtBirth";
ALTER TYPE "SexAtBirth_new" RENAME TO "SexAtBirth";
