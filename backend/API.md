# Authentication API

## POST `/auth/signup`
| Field | Type | Description |
| --- | --- | --- |
| `firstName` | string | Required; trimmed. |
| `lastName` | string | Required; trimmed. |
| `phoneNumber` | string | Required; international digits with `+`/`-` allowed. |
| `dateOfBirth` | string | Required; **ISO 8601 date-only** in `YYYY-MM-DD`. Years below `1900` or future dates are rejected. |
| `sexAtBirth` | string | Optional; `male`, `female`, `intersex`, `not_specified`. |
| `password` | string | Required; 8–128 characters. |
| `confirmPassword` | string | Used only for validation client-side. |

All validation errors include `details` that flag the offending path and a clear message. The server never accepts age directly; it is always derived from the provided DOB.

## POST `/auth/login`
| Field | Type | Description |
| --- | --- | --- |
| `phoneNumber` | string | Required. |
| `password` | string | Required. |

## Date of Birth Format
- Always exchange DOB as an ISO 8601 date-only string (`YYYY-MM-DD`). Example: `1985-03-15`.
- The database column is stored as `DATE` (no time part), and every response echoes the same `YYYY-MM-DD` value so downstream clients can rely on consistent parsing.
- DOB values must fall between January 1, `1900` (configurable via `MINIMUM_DOB_YEAR`) and **today**; future dates are rejected.
- The backend derives the user’s age from the DOB on every request instead of persisting an age field.
- Because DOB is PHI under HIPAA, every API call is expected to transit over HTTPS and to enforce the same role-based access policies as other protected endpoints.
