Migration of fever details to specific_details
Date: 2026-01-31 (Project Time) / Actual execution time

Command executed: npx ts-node scripts/migrate-fever-details.ts

Output:
[dotenv@17.2.3] injecting env (8) from .env
Starting migration of fever details to specific_details...
Found 0 profiles to migrate.
Migration completed successfully.

Notes:
- The script was executed successfully.
- 0 profiles were found needing migration (either empty DB or already migrated).
- The legacy columns (fever_duration, etc.) have subsequently been removed from the schema and database.
- The migration script code has been commented out to prevent compilation errors against the new schema.
