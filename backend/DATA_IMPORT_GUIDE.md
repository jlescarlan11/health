# Naga City Healthcare Facility Data Collection & Import Guide

This document outlines the process for collecting and importing healthcare facility data for the HEALTH application.

## 1. Data Collection Process

### Template
Use the `backend/data/data-collection-template.csv` file as a template for data collection.

### Column Definitions
| Column | Description | Format/Example |
| :--- | :--- | :--- |
| **name** | Full official name of the facility | Naga City General Hospital |
| **type** | Category of facility | `hospital` or `health_center` |
| **address** | Full physical address | Leon Sa Aureus St., Naga City |
| **latitude** | WGS84 Latitude coordinate | 13.621775 |
| **longitude** | WGS84 Longitude coordinate | 123.194824 |
| **phone** | Contact number | (054) 473-3111 |
| **yakap_accredited** | Whether it accepts YAKAP | `true` or `false` |
| **services** | Semicolon-separated list of services | Pediatrics;Internal Medicine;OB-GYN |
| **operating_hours** | General operating hours description | Mon-Sun: 24 Hours |
| **barangay** | Barangay where it is located | Balatas |
| **photos** | Semicolon-separated URLs to photos | https://example.com/photo1.jpg |

### Collection Strategy
1. **Primary Sources**: Naga City Health Office (CHO) records, YAKAP accreditation lists.
2. **Verification**: Cross-reference with Google Maps for coordinates and physical addresses.
3. **Barangay Health Centers**: Ensure all 27 BHCs are included with their specific services (often standardized across Naga City).

## 2. Technical Import Process

The application uses a TypeScript script to import the CSV data into the PostgreSQL database via Prisma.

### Prerequisites
- Node.js installed
- Database connection string in `.env` or `backend/.env`
- Dependencies installed (`npm install` in the `backend` directory)

### Running the Import
From the project root:
```bash
# Navigate to backend
cd backend

# Run the import script
npm run data:import
```

### What the script does:
1. Reads `backend/data/data-collection-template.csv`.
2. Parses CSV content.
3. Checks for existing facilities by name.
4. **Updates** existing records if the name matches.
5. **Creates** new records if the name is not found.
6. Handles data type conversions (Strings to Arrays for services/photos, String to Boolean for YAKAP status, String to Json for operating hours).

## 3. Maintenance

- To update facility information, simply update the CSV and re-run the script.
- The script is idempotent (safe to run multiple times).
- For large-scale updates, it is recommended to back up the database before running the import.
