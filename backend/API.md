# Health App API Documentation

## Base URL
`http://localhost:3000/api`

## Facilities

### List Facilities
GET `/facilities`

Query Parameters:
- `type` (optional): Filter by facility type (hospital, health_center, barangay_center)
- `yakap_accredited` (optional): Filter by YAKAP accreditation (true/false)
- `limit` (optional): Number of results per page (default: 10)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "facilities": [
    {
      "id": "...",
      "name": "...",
      "type": "...",
      "address": "...",
      "yakap_accredited": true,
      ...
    }
  ],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

### Get Facility Details
GET `/facilities/:id`

Response:
```json
{
  "id": "...",
  "name": "...",
  "services": ["..."],
  "operating_hours": { ... },
  ...
}
```

### Nearby Facilities
GET `/facilities/nearby`

Query Parameters:
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Radius in km (default: 5)
- `type` (optional): Filter by type

Response:
```json
[
  {
    "id": "...",
    "distance": 1.23, // Distance in km
    ...
  }
]
```

## Symptoms

### List All Symptoms
GET `/symptoms`

Response:
```json
[
  {
    "id": "...",
    "name": "Fever",
    "category": "common",
    ...
  }
]
```

### Search Symptoms
GET `/symptoms/search`

Query Parameters:
- `q` (required): Search query

Response:
```json
[
  {
    "id": "...",
    "name": "...",
    ...
  }
]
```

## AI Navigation

### Get Recommendations
POST `/ai/navigate`

Body:
```json
{
  "symptoms": "chest pain and shortness of breath",
  "age": "45", // Optional
  "severity": "high", // Optional
  "medical_history": "hypertension" // Optional
}
```

Response:
```json
{
  "recommendation": "Emergency",
  "reasoning": "Symptoms suggest potential cardiac event...",
  "facilities": [ ... ] // Recommended facilities
}
```

## YAKAP Program

### Get Program Info
GET `/yakap/info`

Response:
```json
{
  "program_name": "YAKAP...",
  "description": "...",
  "eligibility": [...],
  "requirements": [...],
  "benefits": [...]
}
```

### Enroll User
POST `/yakap/enrollment`

Body:
```json
{
  "user_id": "unique_id",
  "phone_number": "09123456789"
}
```

Response:
```json
{
  "id": "...",
  "status": "pending",
  "progress_step": 1
}
```

### Get Enrollment Status
GET `/yakap/enrollment/:userId`

Response:
```json
{
  "id": "...",
  "completed": false,
  "progress_step": 2,
  ...
}
```

## Emergency Contacts

### List All Contacts
GET `/emergency-contacts`

Response:
```json
[
  {
    "id": "...",
    "name": "Emergency Hotline",
    "phone": "911",
    ...
  }
]
```

### List by Category
GET `/emergency-contacts/by-category/:category`

Response:
```json
[ ... ]
```
