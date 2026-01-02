# GEMINI.md - Context for HEALTH Project

## Project Overview

**HEALTH** (Help Everyone Access Local Treatment & Healthcare) is an AI-powered mobile application designed for Naga City residents. Its primary goal is to alleviate hospital overcrowding and improve access to primary care by guiding users to the appropriate healthcare facilities.

### Key Features
*   **AI Navigation Assistant:** Uses Google Gemini 2.5 Flash to triage symptoms and recommend care levels (Self-Care, Health Center, Hospital, Emergency).
*   **Facility Directory:** Lists 29 healthcare facilities in Naga City with details like services, hours, and YAKAP accreditation.
*   **YAKAP Enrollment:** Guides eligible residents through the process of enrolling in the free YAKAP healthcare program.
*   **Offline Capability:** Core directory and emergency features function without internet access.
*   **Safety & Fallback:** Implements a conservative decision strategy. If AI confidence is low (< 0.8) or symptoms are ambiguous, the system automatically upgrades the recommendation to a higher level of care (e.g., Health Center to Hospital) to prevent under-triage.

## Architecture & Tech Stack

The project is built as a **React Native** application using **Expo SDK 54**.

*   **Frontend:** React Native 0.81.x, TypeScript, Expo
*   **State Management:** Redux Toolkit (slices located in `src/store/`)
*   **Navigation:** React Navigation (via Expo Router or standard React Navigation 6.x patterns)
*   **AI Integration:** Google Gemini API (`src/services/gemini.ts`)
*   **Maps:** @rnmapbox/maps
*   **Data Persistence:** Expo SQLite (local), Redux Persist
*   **Backend Services:** Firebase Auth, Custom Node.js/Express backend (`backend/` directory), PostgreSQL (Aiven)

### Directory Structure (`src/`)

The application follows a **feature-based** architecture:

*   **`src/features/`**: Contains the core logic and UI for main features:
    *   `facilities/`: Facility directory, list, and details.
    *   `navigation/`: AI assistant chat interface and logic.
    *   `yakap/`: Enrollment guides, status tracking, and completion celebration.
        *   `EnrollmentCompletionScreen.tsx`: Success screen after enrollment with benefits summary and sharing.
*   **`src/services/`**: Business logic and API clients (Gemini, Facility Data).
*   **`src/store/`**: Redux store configuration and slices (`facilitySlice`, `navigationSlice`).
*   **`src/components/`**: Shared UI components (`common/`) and feature-specific components (`features/`).
*   **`src/navigation/`**: Navigation configuration (Stacks, Tabs).

### Backend Directory Structure (`backend/`)

The backend is a Node.js/Express application with TypeScript and Prisma.

*   **`src/`**: Source code for the backend.
    *   `controllers/`: Request handlers.
    *   `routes/`: API route definitions.
    *   `services/`: Business logic.
    *   `middleware/`: Express middleware.
    *   `utils/`: Utility functions.
    *   `server.ts`: Entry point.
*   **`prisma/`**: Database schema and seed files.

## Development Workflow

### Prerequisites
*   Node.js (>= 24.12.0)
*   Expo Go app on a physical device OR Android/iOS Emulator

### Setup
1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    *   Ensure `.env` exists (copied from `.env.example`).
    *   Keys needed: `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN`, etc.

### Running the App
*   **Start the development server:**
    ```bash
    npx expo start
    ```
*   **Run on Android Emulator:**
    ```bash
    npm run android
    ```
*   **Run on iOS Simulator:**
    ```bash
    npm run ios
    ```

## Coding Conventions

*   **Language:** TypeScript (Strict mode preferred).
*   **Formatting:** Prettier is configured (`.prettierrc`).
*   **Linting:** ESLint (`.eslintrc.js`).
*   **Styling:** Likely using a component library (React Native Paper) or custom styles matching the `assets/` design.
*   **State:** Use Redux Toolkit for global state. Local state for component-specific UI logic.
*   **Async Logic:** Handled within Services or Redux Thunks.

## Critical Files
*   `App.tsx`: Application entry point.
*   `src/store/store.ts`: Redux store definition.
*   `src/services/gemini.ts`: Interface for the AI Assistant.
*   `src/features/navigation/NavigationAssistant.tsx`: Main UI for the AI chat.
*   `project-brief.md`: Detailed product requirements and context.

## Recent Updates (Jan 2, 2026)
*   **Mapbox Integration:** Implemented fully functional map view using `@rnmapbox/maps`.
    *   **Features:** Marker clustering, custom markers (Hospital/Health Center/YAKAP), user location tracking, and route drawing via Mapbox Directions API.
    *   **Offline Support:** Automatic downloading of offline map packs for Naga City region on map initialization.
    *   **Navigation:** Seamless transition between List and Map views. "Get Directions" in Facility Details now offers in-app navigation or external maps.
    *   **Files Created/Modified:** 
        *   `src/services/mapService.ts` (New: Directions API & Offline Manager)
        *   `src/components/features/facilities/FacilityMapView.tsx` (Major update: Route display, interactions)
        *   `src/features/facilities/FacilityDirectoryScreen.tsx` (Added `initialViewMode` param support)
        *   `src/screens/FacilityDetailsScreen.tsx` (Integrated map actions)
*   **Geolocation Support:** Implemented `expo-location` for real-time user positioning and distance calculation.
    *   **Features:** Runtime permission handling with graceful fallbacks, active location watching when map is visible, and automatic distance-based sorting of facilities.
    *   **Architecture:** Created reusable `useUserLocation` hook and integrated location state into Redux (`facilitiesSlice`) for global access.
    *   **Integration:** 
        *   `FacilityDirectoryScreen`: Toggles location watching based on view mode (Map vs List).
        *   `FacilityMapView`: Uses Redux location state for centering and routing.
        *   `RecommendationScreen`: Fetches location to ensure nearest facility recommendations are accurate.
    *   **Files Created/Modified:** `src/hooks/useUserLocation.ts`, `src/store/facilitiesSlice.ts`, `src/features/facilities/FacilityDirectoryScreen.tsx`, `src/components/features/facilities/FacilityMapView.tsx`.
