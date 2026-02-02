<div align="center">

<!-- Placeholder for Logo -->
<img src="assets/images/icon.png" alt="HEALTH Logo" width="120" height="120" />

# HEALTH (Help Everyone Access Local Treatment & Healthcare)

**Healthcare Made Simple for Naga City.**

<!-- Badges -->

[Live Demo](https://drive.google.com/file/d/1mDuvWKPe3xmRmnvoXtVhH0FTQzFrqaNR/view?usp=drive_link) | [Video Walkthrough](https://drive.google.com/file/d/1UOtM94o0N0Fg-aS475Yhz7-aLLDkdmU7/view?usp=drive_link)

</div>

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Demo](#demo)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Challenges](#challenges)
- [Future Scope](#future-scope)
- [Team](#team)
- [Acknowledgments](#acknowledgments)

---

## Problem Statement

Naga City faces a critical healthcare imbalance where the **Naga City General Hospital (NCGH)** is severely overcrowded with non-emergency cases, causing wait times of **2-4 hours**. Meanwhile, **27 barangay health centers** remain underutilized, and approximately **61% of eligible residents** have not yet enrolled in the free **YAKAP healthcare program** due to a lack of information. This disconnection prevents residents from accessing the timely, appropriate care they are entitled to.

---

## Solution

**HEALTH** is an AI-powered mobile navigation application that serves as a digital triage officer for Naga City residents. It uses **Google’s Gemini AI** through a dedicated backend to analyze symptoms and guide users to the appropriate level of care, whether self-care, a barangay health center, or the emergency room. The app also streamlines enrollment in the YAKAP program and provides an offline-accessible directory of local health facilities to ensure equitable access to healthcare resources.

Offline clinical notebook keeps assessments, medication logs, and the facilities directory in local SQLite tables, migrates schema changes safely, and sends updates through a rate-limited sync service when connectivity returns—while the offline Redux slice gates guest mode so sensitive data never leaves the device until a signed-in session is available.

---

## Demo

- [Live Demo](https://drive.google.com/file/d/1mDuvWKPe3xmRmnvoXtVhH0FTQzFrqaNR/view?usp=drive_link) — walkthrough of the mobile flows.
- [Video Walkthrough](https://drive.google.com/file/d/1UOtM94o0N0Fg-aS475Yhz7-aLLDkdmU7/view?usp=drive_link) — narrated explanation of the architecture and AI safeguards.

---

## Architecture

The system follows a **client-server architecture** that keeps the Expo mobile app responsive even when the network drops, while the backend stays in charge of safety, scheduling, and data persistence.

```mermaid
graph TD
    User[User] --> Mobile[Expo Mobile App]
    Mobile -->|REST / auth| Backend[Node + Express Backend]
    Mobile -->|Gemini requests| GeminiClient[Gemini Client (cache + rate limiting + overrides)]
    Mobile -->|Offline cache| SQLite[Local SQLite + AsyncStorage]
    SQLite -->|Background sync| SyncService[Sync Service + Offline Slice]
    Backend -->|Prisma| Postgres[(PostgreSQL)]
    Backend -->|Safety| Arbiter[Triage Arbiter]
    Backend -->|AI calls| GeminiAI[Google Gemini 2.5 Flash]
    Cron[Node-cron Health Feed Cron] --> HealthFeedService[Health Feed Service]
    HealthFeedService --> Postgres
    Backend -->|Feeds & routes| HealthFeedRoutes[/feed/health]
    SyncService --> Backend
    GeminiClient --> Backend
    Mobile -->|Triage tree| FlowAsset[assets/triage-flow.json + TriageEngine]
```

**Data Flow:** Symptoms, location, and patient info flow through the Expo app, the deterministic triage tree (`mobile/assets/triage-flow.json`) and the local `TriageEngine`, while the backend validates each recommendation via Prisma-backed PostgreSQL, the Triager Arbiter, and Gemini before returning a conservative plan. Offline SQLite tables (facilities, clinical history, medications) capture every note in the clinical notebook, and the sync service plus Redux offline slice replay them to the backend only when the device is online and authenticated.

The backend also orchestrates a nightly scraper (`node-cron` in `backend/src/server.ts`) that refreshes the `healthFeedService`, exposing `/api/feed/health` plus a manual `/feed/health/sync` endpoint so the mobile `Health Hub` can show the latest Naga City announcements. This feed writes into Prisma models for facilities, clinical history, and health news before being cached in AsyncStorage for fast reads.

On the safety front, the Triager Arbiter (`backend/src/services/triage/TriageArbiter.ts`) enforces saturation, clarifications, protocol slots, and defensive red-/vulnerable-flag logic before Gemini can finalize a recommendation, while the mobile Gemini client (`mobile/src/api/geminiClient.ts`) caches plans/responses, enforces RPM/daily limits, applies emergency/mental-health overrides, and logs conservative upgrades before the UI ever displays the answer.

---

## Key Features

- **Offline clinical notebook & persistence:** Assessments, medication logs, and the facilities directory live inside Expo SQLite tables with schema migration, locking, and a Redux offline slice that caps guest mode, while a rate-limited background sync service replays clinical history whenever connectivity and authentication permit (`mobile/src/services/database.ts`, `mobile/src/store/offlineSlice.ts`, `mobile/src/services/syncService.ts`).
- **Digital Health ID with QR snapshot:** A reusable component surfaces a QR snapshot plus key vitals so community health workers can capture and share a patient profile in the field (`mobile/src/components/features/profile/DigitalIDCard.tsx`).
- **Medication Tracker + reminders:** The medication tracker screen couples logging, “taken” toggles, and Calendar reminders so pills stay aligned with custom schedules even when offline (`mobile/src/screens/MedicationTrackerScreen.tsx`, `mobile/src/services/calendarService.ts`).
- **Crisis hotline hub with mental health keyword detection:** Crisis Support screen highlights local hotlines and keyword-driven guidance powered by custom mental-health detectors before any AI request touches Gemini (`mobile/src/screens/CrisisSupportScreen.tsx`, `mobile/src/services/mentalHealthDetector.ts`).
- **Location-aware facility directory:** Facility directory screen shows filters, teleconsult badges, share/call/directions actions, and permission-aware hooks backed by compact cards and action buttons with GPS context (`mobile/src/features/facilities/FacilityDirectoryScreen.tsx`, `mobile/src/components/common/FacilityCard.tsx`, `mobile/src/components/common/FacilityActionButtons.tsx`).
- **Health Hub news feed:** Mobile UI displays the latest Naga City health announcements scraped nightly (and on-demand) by the backend cron/healthFeedService so residents stay informed (`mobile/src/screens/HealthHubScreen.tsx`, `backend/src/services/healthFeedService.ts`).
- **YAKAP guide with benefits, pathways, FAQs:** Guided Yakap landing page and structured content library surface eligibility help plus FAQs to drive enrollment (`mobile/src/features/yakap/YakapHomeScreen.tsx`, `mobile/src/features/yakap/yakapContent.ts:1-150`).

---

## Tech Stack

### Frontend (Mobile)

- **Framework:** Expo SDK ~54.0.32 running React 19.1 / React Native 0.81 with Expo Router 6 for file-based navigation.
- **State & storage:** Redux Toolkit + Redux Persist, AsyncStorage, and SQLite tables for facilities, clinical history, and medication logs.
- **Networking & utilities:** Axios for API calls, date-fns for scheduling, and Expo modules for Location, SQLite, SecureStore, Calendar, and Haptics.
- **UI & navigation helpers:** React Navigation, React Native Paper, QR generation, and themed components for consistent screens.

### Backend Services (Separate Repo)

- **Runtime:** Node.js 18+ with Express 5.2 (TypeScript), dotenv config, and express-rate-limit to protect the AI surface.
- **ORM & persistence:** Prisma 7.3 wired to a custom `backend/src/lib/prisma.ts` pg pool with models for facilities, clinical history, and the health feed.
- **Authentication & security:** Argon2 hashing, JWT middleware, and Prisma transactions.
- **AI & orchestration:** @google/generative-ai powering Gemini 2.5 Flash, the Triager Arbiter safety service, and deterministic `triage-flow.json`/`TriageEngine` logic.
- **Background jobs:** node-cron scraper refreshes `/api/feed/health` nightly while Prisma seeds/import scripts keep facility data current.

### Development & Tools

- **Mobile:** Expo CLI / EAS for builds, `npx expo start` for dev, and Expo Go for hardware testing.
- **Backend:** `npm run dev` (nodemon), `ts-node` scripts for seeding/importing, ESLint, and Vitest for fast feedback.

---

## Getting Started

### Prerequisites

- Node.js (v18 or newer) and npm or yarn.
- PostgreSQL (or a compatible provider) for the backend `DATABASE_URL`.
- Expo CLI / Expo Go app for the mobile client.
- A Gemini API key, since both the backend and frontend funnel LLM requests through Gemini-aware services.

### Backend Setup

1. `cd backend` and install dependencies:

```bash
npm install
```

2. Copy the sample `.env.example` (the code prefers `backend/.env` but falls back to the parent directory) and set the secrets listed below before starting the server:

```
DATABASE_URL=<postgres://...>
JWT_SECRET=<strong random secret>
GEMINI_API_KEY=<Gemini key for @google/generative-ai>
```

3. Seed the facilities table (the script imports `scripts/import-facilities.ts`):

```bash
npm run data:import
```

4. Start the backend in dev mode (nodemon + cron + Prisma):

```bash
npm run dev
```

This also kicks off the nightly scraper (`backend/src/server.ts`) that keeps `/api/feed/health` fresh.

### Mobile Setup

1. `cd mobile` and install npm packages:

```bash
npm install
```

2. Copy `.env.example` and configure the public backend URL if Expo cannot auto-detect it:

```
EXPO_PUBLIC_BACKEND_URL=http://host:3000/api
```

`mobile/src/services/apiConfig.ts` auto-detects the Metro bundler IP on Expo Go (and gracefully falls back to `EXPO_PUBLIC_BACKEND_URL`) so the native client can reach the backend without extra config.

3. Start Expo:

```bash
npx expo start
```

4. Use Expo Go (scan QR) or press `a`/`i` to launch on emulators. Ensure the backend is already running and seeded so the mobile app can sync facilities and clinical history before triage.

---

## Challenges

- **Resilient clinical history sync:** The mobile sync service handles offline SQLite state, tracks unsynced records, and uses exponential backoff plus rate-limit awareness so a burst of 429s/5xxs will pause retries until the backend is healthy (`mobile/src/services/syncService.ts:84-280`).
- **AI rate limiting & safety caching:** The Gemini client enforces RPM/daily quotas, caches plans and responses, logs conservative upgrades, and retries only transient failures so the user-facing flow can stay online without exhausting Gemini or introducing hallucinations (`mobile/src/api/geminiClient.ts:40-1265`).
- **Emergency & mental health gating before AI:** Custom emergency and mental-health keyword detectors (with contextual exclusions, scoring, and override responses) guard every triage input before the Gemini client is even invoked, ensuring high-risk flags are escalated immediately (`mobile/src/services/emergencyDetector.ts:9-233`, `mobile/src/services/mentalHealthDetector.ts:1-100`).

---

## Future Scope

- **Admin & predictive analytics dashboard:** The “Report an issue” modal on the home tab already captures reported issues which makes it easy for the admin to check for user's concern. Moreover, connecting the dashboard with the health reports/clinical history data would feed a predictive dashboard that highlights the most common symptoms, frequent facility arrivals, and emerging hot spots for administrators to act on (`mobile/src/screens/MainHomeScreen.tsx:1-130`, `mobile/src/services/apiConfig.ts:1-48`, `mobile/src/screens/ClinicalHistoryScreen.tsx`).
- **Health alerts & notifications:** HEALTH already surfaces the backend health feed and clinical history summaries, so we can push signal-based alerts or scheduled notifications that summarize recent user reports and growth in critical cases (`mobile/src/screens/HealthHubScreen.tsx:8-120`, `backend/src/services/healthFeedService.ts:1-220`).
- **Private mode for sensitive topics:** The Symptom Assessment flow can gain a “private mode” toggle to keep sensitive entries local, mask logs, and delay syncing until the user explicitly opts in, building on the existing `SymptomAssessmentScreen.tsx` flow and offline clinical notebook.
- **Community forum & expanded Health Hub articles:** The Health Hub screen and Yakap content data already support rich text and FAQs; extending that feed into a linked forum plus more curated articles would let residents share experiences while still blending Gemini-validated content (`mobile/src/screens/HealthHubScreen.tsx:8-120`, `mobile/src/features/yakap/yakapContent.ts:1-150`).
- **Telemedicine extension of the facility directory:** Facility cards, action buttons, and teleconsult badges can become a telemedicine layer with live availability, queue data, and a richer booking surface tied into the directory’s filters and GPS context (`mobile/src/features/facilities/FacilityDirectoryScreen.tsx:26-247`, `mobile/src/components/common/FacilityCard.tsx:33-185`, `mobile/src/components/common/FacilityActionButtons.tsx:1-40`).
- **YAKAP articles & FAQs:** The structured Yakap content library (`mobile/src/features/yakap/yakapContent.ts:1-150`) contains benefits, pathways, and frequently asked questions that can be surfaced as a future article feed or knowledge base widget.

---

## Team

**Team CTRL+H**

- John Lester Escarlan - Project and Technical Lead | [GitHub](https://github.com/jlescarlan1)
- Nicolete Reine Guarin - Developer | [GitHub](https://github.com/aquaryasss)
- Merl Jhun Catiquista - Research and Data Collection | [GitHub](https://github.com/merljhun)
- Jen Bolat-ag - Quality Assurance | [GitHub](https://github.com/jbbolatag1-wq)
- Al Glenrey Tilacas - Creative Director | [GitHub](https://github.com/Alglenrey)

---

## Acknowledgments

- **Naga City Government** for organizing the Mayoral Hackathon and providing facility data.
- **Open Source Community** for the incredible React Native and Node.js ecosystems.
