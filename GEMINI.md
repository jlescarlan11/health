# GEMINI.md - Context for HEALTH Project

## Project Overview

**HEALTH** (Help Everyone Access Local Treatment & Healthcare) is an AI-powered mobile application designed for Naga City residents. Its primary goal is to alleviate hospital overcrowding and improve access to primary care by guiding users to the appropriate healthcare facilities.

### Key Features

- **AI Navigation Assistant:** Uses Google Gemini 2.5 Flash to triage symptoms and recommend care levels (Self-Care, Health Center, Hospital, Emergency).
- **Facility Directory:** Lists 29 healthcare facilities in Naga City with details like services, hours, and YAKAP accreditation.
- **YAKAP Enrollment:** Guides eligible residents through the process of enrolling in the free YAKAP healthcare program.
- **Offline Capability:** Core directory and emergency features function without internet access.
- **Safety & Fallback:** Implements a conservative decision strategy. If AI confidence is low (< 0.8) or symptoms are ambiguous, the system automatically upgrades the recommendation to a higher level of care (e.g., Health Center to Hospital) to prevent under-triage.

## Architecture & Tech Stack

The project is built as a **React Native** application using **Expo SDK 54**.

- **Frontend:** React Native 0.81.x, TypeScript, Expo
- **State Management:** Redux Toolkit (slices located in `src/store/`)
- **Navigation:** React Navigation (via Expo Router or standard React Navigation 6.x patterns)
- **AI Integration:** Google Gemini API (`src/services/gemini.ts`)
- **Maps:** @rnmapbox/maps
- **Data Persistence:** Expo SQLite (local), Redux Persist
- **Backend Services:** Firebase Auth, Custom Node.js/Express backend (`backend/` directory), PostgreSQL (Aiven)

### Directory Structure (`src/`)

The application follows a **feature-based** architecture:

- **`src/features/`**: Contains the core logic and UI for main features:
  - `facilities/`: Facility directory, list, and details.
  - `navigation/`: AI assistant chat interface and logic.
  - `yakap/`: Enrollment guides, status tracking, and completion celebration.
    - `EnrollmentCompletionScreen.tsx`: Success screen after enrollment with benefits summary and sharing.
- **`src/services/`**: Business logic and API clients (Gemini, Facility Data).
- **`src/store/`**: Redux store configuration and slices (`facilitySlice`, `navigationSlice`).
- **`src/components/`**: Shared UI components (`common/`) and feature-specific components (`features/`).
- **`src/navigation/`**: Navigation configuration (Stacks, Tabs).

### Backend Directory Structure (`backend/`)

The backend is a Node.js/Express application with TypeScript and Prisma.

- **`src/`**: Source code for the backend.
  - `controllers/`: Request handlers.
  - `routes/`: API route definitions.
  - `services/`: Business logic.
  - `middleware/`: Express middleware.
  - `utils/`: Utility functions.
  - `server.ts`: Entry point.
- **`prisma/`**: Database schema and seed files.

## Development Workflow

### Prerequisites

- Node.js (>= 24.12.0)
- Expo Go app on a physical device OR Android/iOS Emulator

### Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    - Ensure `.env` exists (copied from `.env.example`).
    - Keys needed: `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN`, etc.

### Running the App

- **Start the development server:**
  ```bash
  npx expo start
  ```
- **Run on Android Emulator:**
  ```bash
  npm run android
  ```
- **Run on iOS Simulator:**
  ```bash
  npm run ios
  ```

## Coding Conventions

- **Language:** TypeScript (Strict mode preferred).
- **Formatting:** Prettier is configured (`.prettierrc`).
- **Linting:** ESLint (`.eslintrc.js`).
- **Styling:** Likely using a component library (React Native Paper) or custom styles matching the `assets/` design.
- **State:** Use Redux Toolkit for global state. Local state for component-specific UI logic.
- **Async Logic:** Handled within Services or Redux Thunks.

## Critical Files

- `App.tsx`: Application entry point.
- `src/store/store.ts`: Redux store definition.
- `src/services/gemini.ts`: Interface for the AI Assistant.
- `src/features/navigation/NavigationAssistant.tsx`: Main UI for the AI chat.
- `project-brief.md`: Detailed product requirements and context.

## Recent Updates (Jan 2, 2026)

- **Mapbox Integration:** Implemented fully functional map view using `@rnmapbox/maps`.
  - **Features:** Marker clustering, custom markers (Hospital/Health Center/YAKAP), user location tracking, and route drawing via Mapbox Directions API.
  - **Offline Support:** Automatic downloading of offline map packs for Naga City region on map initialization.
  - **Navigation:** Seamless transition between List and Map views. "Get Directions" in Facility Details now offers in-app navigation or external maps.
  - **Files Created/Modified:**
    - `src/services/mapService.ts` (New: Directions API & Offline Manager)
    - `src/components/features/facilities/FacilityMapView.tsx` (Major update: Route display, interactions)
    - `src/features/facilities/FacilityDirectoryScreen.tsx` (Added `initialViewMode` param support)
    - `src/screens/FacilityDetailsScreen.tsx` (Integrated map actions)
- **Geolocation Support:** Implemented `expo-location` for real-time user positioning and distance calculation.
  - **Features:** Runtime permission handling with graceful fallbacks, active location watching when map is visible, and automatic distance-based sorting of facilities.
  - **Architecture:** Created reusable `useUserLocation` hook and integrated location state into Redux (`facilitiesSlice`) for global access.
  - **Integration:**
    - `FacilityDirectoryScreen`: Toggles location watching based on view mode (Map vs List).
    - `FacilityMapView`: Uses Redux location state for centering and routing.
    - `RecommendationScreen`: Fetches location to ensure nearest facility recommendations are accurate.
  - **Files Created/Modified:** `src/hooks/useUserLocation.ts`, `src/store/facilitiesSlice.ts`, `src/features/facilities/FacilityDirectoryScreen.tsx`, `src/components/features/facilities/FacilityMapView.tsx`.
- **Color Palette Update:** Implemented a unified color system across the app.
  - **Palette:** Background `#F5F7F8`, Primary `#379777` (Green), Secondary `#F4CE14` (Yellow), Text/Surface `#45474B`.
  - **Implementation:** Created `src/theme/index.ts` defining a custom React Native Paper theme. Refactored major screens and components (`App.tsx`, `MainHomeScreen`, `FacilityDetailsScreen`, `FacilityMapView`, `YakapHomeScreen`, etc.) to use `useTheme` and dynamic colors instead of hardcoded hex values.

## Recent Updates (Jan 12, 2026)

- **Input Field Refinement:** Enhanced the `InputCard` component used in AI Navigator and Symptom Assessment.
  - **Floating Labels:** Implemented `mode="outlined"` with floating labels that transition to the border on focus, improving clarity and alignment.
  - **Dynamic Height:** The input field now automatically expands from a single line (40px) up to three lines (approx. 100px) based on content.
  - **External Action Buttons:** The microphone and send buttons are now positioned outside the `TextInput` border for better clarity.
  - **Interaction Logic:** Initially displays only the microphone button; when text is entered, it is replaced by the send button.
  - **Button UI Refinement:** Replaced borders with subtle background highlights. The action buttons have been resized to a compact 40px for better balance. The recording indicator features a polished "breathing" animation that smoothly pulses both scale and opacity.
  - **Vertical Alignment:** Refined `minHeight`, `lineHeight`, and `textContent` padding to ensure text is perfectly centered vertically and starts as a true single line.
  - **Layout Optimization:** Removed gaps between the input card and bottom navigation for a more cohesive feel, with a subtle 8px spacing for balance.
  - **Visual Consistency:** Removed redundant placeholders in favor of consistent floating labels across the app.
  - **Files Modified:** `src/components/common/InputCard.tsx`, `src/features/navigation/NavigatorHomeScreen.tsx`, `src/screens/SymptomAssessmentScreen.tsx`.

- **Authentication Removal & Redux Fix:** Completely removed all authentication-related functionality, screens, and logic.
  - **UI/UX:** Removed the "Me" tab, Profile screen, and login flows (Phone/OTP). Simplified greetings in `HomeHero` and removed the profile button from `CustomHeader`.
  - **Redux Implementation:** Deleted `authSlice`, updated `rootReducer`, and implemented a Redux Persist migration (Version 1) to surgically purge legacy `auth` state, resolving the "unexpected key" warning.
  - **Backend:** Removed authentication middleware from all routes. YAKAP enrollment is now a public flow.
  - **Cleanup:** Removed `@react-native-firebase/auth` dependency and purged auth references from `API.md` and `google-services.json`.
  - **Files Modified:** `src/store/index.ts`, `App.tsx`, `src/navigation/TabNavigator.tsx`, `src/types/navigation.ts`, `backend/src/routes/yakapRoutes.ts`, etc.

- **Recommendation & Facility UI Overhaul:** Significantly improved the UI of the recommendation results and facility listings for better clarity and visual appeal.
  - **Recommendation Card:** Implemented a new design for the recommendation card with care-level specific color palettes (e.g., soft greens for Health Center). Refined typography for "YOUR CONDITION" and "RECOMMENDED ACTION" headers using uppercase labels with increased letter spacing.
  - **Critical Alerts:** Redesigned the "Watch for" / Red Flags section with a distinctive semi-transparent background and bold warning icons to ensure high visibility of critical safety information.
  - **Facility Card Refinement:** Modernized `FacilityCard` with a cleaner, flatter design. Repositioned YAKAP badges and distance indicators for better balance, and updated service chips to use the primary container palette for a cohesive look.
  - **Japanese Design System Alignment:** All components now strictly adhere to the Washi/Tokiwa-iro/Kitsune-iro palette, providing a professional and localized experience for Naga City residents.
  - **Files Modified:** `src/screens/RecommendationScreen.tsx`, `src/components/common/FacilityCard.tsx`.

- **YAKAP Feature Finalization (Jan 13, 2026):**
  - **Stateless Refactor:** Verified and finalized the YAKAP enrollment flow as a purely informational, step-by-step guide.
  - **Persistence Removal:** Removed `enrollmentSlice` from Redux store and all references to `startEnrollment`/`dispatch`. The flow now relies solely on navigation parameters and local component state.
  - **Backend Cleanup:** Removed enrollment-related endpoints (`/enrollment`, `/enrollment/:userId`) and logic from `backend/src/routes/yakapRoutes.ts`, `controllers/yakapController.ts`, and `services/yakapService.ts` to ensure no user data is persisted.
  - **Verification:** Passed full TypeScript checks for both frontend and backend.

*   **Button Standardization (Jan 13, 2026):**
    *   **Shared Component Refactor:** Enhanced `src/components/common/Button.tsx` to include 'text' variant and support full native prop overrides (buttonColor, textColor).
    *   **Global Implementation:** Replaced all direct `react-native-paper` Button usages with the shared component across all features (YAKAP, Facilities, Navigation, Screens) for visual consistency.
    *   **Cleanup:** Removed dead code and unused styles related to legacy button implementations.

*   **Accessibility Improvements (Jan 14, 2026):**
    *   **Contrast Fix:** Resolved a WCAG AA violation on the Eligibility Check page by updating the "Step 1" heading color. Changed from low-contrast yellow (`secondary`) to `onSurface` (`#45474B`), achieving a 8.6:1 contrast ratio against the light background (`#F5F7F8`).
    *   **Files Modified:** `src/features/yakap/EligibilityCheckerScreen.tsx`.
