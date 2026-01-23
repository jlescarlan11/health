# GEMINI.md - Context for HEALTH Project

## Project Overview

**HEALTH** (Help Everyone Access Local Treatment & Healthcare) is an AI-powered mobile application designed for Naga City residents. Its primary goal is to alleviate hospital overcrowding and improve access to primary care by guiding users to the appropriate healthcare facilities.

### Key Features

- **Check Symptom Assistant:** Uses Google Gemini 2.5 Flash to triage symptoms and recommend care levels (Self-Care, Health Center, Hospital, Emergency).
- **Model Note**: The project explicitly uses 'gemini-2.5-flash' as verified by the user.
- **AI Question Generator**: The generator must assign the identifier `red_flags` to relevant screening questions in `prompts.ts`.
- **UI Components**: Implemented `MultiSelectChecklist` for red flag screening in `SymptomAssessmentScreen.tsx`.
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

- **Input Field Refinement:** Enhanced the `InputCard` component used in Check Symptom and Symptom Assessment.
  - **Floating Labels:** Implemented `mode="outlined"` with floating labels that transition to the border on focus, improving clarity and alignment.
  - **Dynamic Height:** The input field now automatically expands from a single line (40px) up to three lines (approx. 100px) based on content.
  - **External Action Buttons:** The microphone and send buttons are now positioned outside the `TextInput` border for better clarity.
  - **Interaction Logic:** Initially displays only the microphone button; when text is entered, it is replaced by the send button.
  - **Button UI Refinement:** Replaced borders with subtle background highlights. The action buttons have been resized to a compact 40px for better balance. The recording indicator features a polished "breathing" animation that smoothly pulses both scale and opacity.
  - **Vertical Alignment:** Refined `minHeight`, `lineHeight`, and `textContent` padding to ensure text is perfectly centered vertically and starts as a true single line.
  - **Layout Optimization:** Removed gaps between the input card and bottom navigation for a more cohesive feel, with a subtle 8px spacing for balance.
  - **Visual Consistency:** Removed redundant placeholders in favor of consistent floating labels across the app.
  - **Files Modified:** `src/components/common/InputCard.tsx`, `src/features/navigation/CheckSymptomScreen.tsx`, `src/screens/SymptomAssessmentScreen.tsx`.

- **Keyboard Interaction Update (Jan 15, 2026):**
  - **Behavior Change:** Removed `KeyboardAvoidingView` and all automatic keyboard adjustment logic from `CheckSymptomScreen` and `SymptomAssessmentScreen`. The input field and action buttons now remain static at the bottom of the screen, allowing the keyboard to overlay them rather than pushing the content up or resizing the view.
  - **Files Modified:** `src/features/navigation/CheckSymptomScreen.tsx`, `src/screens/SymptomAssessmentScreen.tsx`.

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

* **Button Standardization (Jan 13, 2026):**
  - **Shared Component Refactor:** Enhanced `src/components/common/Button.tsx` to include 'text' variant and support full native prop overrides (buttonColor, textColor).
  - **Global Implementation:** Replaced all direct `react-native-paper` Button usages with the shared component across all features (YAKAP, Facilities, Navigation, Screens) for visual consistency.
  - **Cleanup:** Removed dead code and unused styles related to legacy button implementations.

* **Accessibility Improvements (Jan 14, 2026):**
  - **Contrast Fix:** Resolved a WCAG AA violation on the Eligibility Check page by updating the "Step 1" heading color. Changed from low-contrast yellow (`secondary`) to `onSurface` (`#45474B`), achieving a 8.6:1 contrast ratio against the light background (`#F5F7F8`).
  - **UI Standardization:** Standardized registration path buttons (Online vs. Local Office) to use the `outline` variant, ensuring consistent visual weight and hierarchy across both options.
  - **State Persistence:** Implemented local state recovery for the Eligibility Check page. User's PhilHealth identification status is now persisted across app restarts using `settingsSlice` and Redux Persist, ensuring a seamless experience when returning to the enrollment flow.
  - **Edit Answer Refinement:** Optimized the "Change my answer" flow with explicit state resets and `LayoutAnimation` feedback. Ensured that eligibility state is retained when navigating back from secondary screens unless explicitly edited.
  - **Files Modified:** `src/features/yakap/EligibilityCheckerScreen.tsx`, `src/store/settingsSlice.ts`.

* **Keyboard & Layout Optimization (Jan 15, 2026):**
  - **Keyboard Awareness:** Integrated `react-native-keyboard-aware-scroll-view` to prevent the system keyboard from covering input fields in `CheckSymptomScreen` and `SymptomAssessmentScreen`.
  - **Dynamic View Resizing:** Implemented `KeyboardAvoidingView` in `FacilityDirectoryScreen` to ensure the facility list remains visible and accessible while the search bar is focused on both iOS and Android.
  - **Safe Area Integration:** Standardized `SafeAreaView` usage across all screens with explicit edge handling to prevent layout shifts and ensure consistent spacing with system UI elements.
  - **Files Modified:** `src/features/navigation/CheckSymptomScreen.tsx`, `src/screens/SymptomAssessmentScreen.tsx`, `src/features/facilities/FacilityDirectoryScreen.tsx`, `package.json`.

* **Layout Fixes (Jan 15, 2026):**
  - **Keyboard Overlap:** Resolved issues where the keyboard covered input fields in `CheckSymptomScreen` and `SymptomAssessmentScreen` by switching `KeyboardAvoidingView` behavior to `height` on Android. This ensures the view resizes correctly with the edge-to-edge configuration.
  - **System Navigation Safety:** Updated input containers to explicitly include `insets.bottom` plus an 8px buffer in their padding. This prevents the input fields from being obscured by the Android system navigation bar (gesture bar or buttons).
  - **Merge Resolution:** Concluded a pending merge of the `development` branch while applying these layout fixes.
  - **Files Modified:** `src/features/navigation/CheckSymptomScreen.tsx`, `src/screens/SymptomAssessmentScreen.tsx`.

* **Navigation Refactor & System Integration (Jan 15, 2026):**
  - **Removed Custom Bottom Navigation:** Deleted the custom bottom tab bar (`TabNavigator`) to eliminate conflicts with native system navigation gestures and buttons. The app now uses a clean, stack-based navigation structure rooted at `MainHomeScreen`.
  - **Native Navigation Support:** Implemented back buttons in the headers of all primary feature screens (`CheckSymptomScreen`, `FacilityDirectoryScreen`, `YakapHomeScreen`) to ensure users can navigate back to the home screen using either the in-app UI or the system back button.
  - **Deep Linking Update:** Updated the `linking` configuration in `App.tsx` to reflect the flattened navigation structure, removing the nested `Main` route.
  - **Files Modified/Deleted:** `src/navigation/TabNavigator.tsx` (Deleted), `src/navigation/AppNavigator.tsx`, `src/types/navigation.ts`, `App.tsx`.

* **Prompt Refinement for Symptom Assessment (Jan 16, 2026):**
  - **Checklist Integration:** Updated `CLARIFYING_QUESTIONS_PROMPT` in `src/constants/prompts.ts` to include a strict checklist for Age, Duration, Severity, Progression, and Red Flag Denials. Added efficiency logic to ask compound questions when dialogue turn count > 2 and implemented early exit conditions (automatically concluding at Turn 5 or if a Red Flag is identified) to ensure timely guidance.
  - **Efficiency Optimization:** Instructed the AI to identify missing data points from the checklist, avoid redundant questions, and combine queries to reduce chat turns.
  - **Tone & Naturalness:** Ensured the AI maintains an empathetic and professional tone while strictly adhering to the JSON schema for seamless UI integration.
  - **Files Modified:** `src/constants/prompts.ts`.

- **Symptom Assessment Progress & Logic Fix (Jan 16, 2026):**
  - **Progress Tracking:** Fixed the "progress reset" bug by changing the progress calculation to track the total number of unique questions answered (`Object.keys(answers).length`) rather than the index within the current question batch.
  - **Global Question State:** Refactored `SymptomAssessmentScreen` to maintain a global, cumulative list of questions instead of replacing state with each new AI batch. This ensures that the report generation at the end of the assessment has access to the text of all questions asked, not just the last batch.
  - **Parsing Resilience:** Updated `src/services/gemini.ts` to gracefully handle empty question arrays from the AI (indicating "no more questions") instead of throwing a parsing error.
  - **Test Coverage:** Updated `tests/SymptomAssessmentTurns.test.tsx` to accurately mock the 5-turn assessment flow and verified that all frontend tests pass.
  - **Files Modified:** `src/screens/SymptomAssessmentScreen.tsx`, `src/services/gemini.ts`, `tests/SymptomAssessmentTurns.test.tsx`.

* **Symptom Assessment UI Improvements (Jan 18, 2026):**
  - **Context-Aware Answer Formatting:** Resolved the issue where non-symptom answers (like Age or Duration) were incorrectly prefixed with "I'm experiencing...". Implemented `formatSelectionAnswer` to apply appropriate templates based on the question type (e.g., "I am [Age] years old").
  - **Single-Select Radio Support:** Upgraded `MultiSelectChecklist` to support a `singleSelection` mode using Radio Buttons. Questions with defined options (excluding explicitly multi-select ones) now enforce single-selection logic with a clear Radio UI instead of auto-submitting Chips.
  - **Interaction Refinement:** The "Confirm" button is now strictly disabled until a selection is made, preventing empty submissions. Added explicit "None" option handling for cleaner negative responses.
  - **Fallback Logic:** Restored the "I'm not sure" Chip for open-text questions to ensure users can still skip if needed.
  - **Files Modified:** `src/screens/SymptomAssessmentScreen.tsx`, `src/components/common/MultiSelectChecklist.tsx`.

- **Gemini Streaming Fix (Jan 19, 2026):**
  - **Streaming Compatibility:** Resolved a runtime error ("Cannot read property 'pipeThrough' of undefined") caused by `generateContentStream` usage in React Native (Hermes).
  - **Implementation:** Refactored `streamGeminiResponse` in `src/services/gemini.ts` to bypass the incompatible streaming method. It now uses `generateContentWithRetry` (unary) and simulates streaming by yielding chunks of the text response. This maintains the `AsyncGenerator` interface and preserves the typing effect in the UI without crashing the app.
  - **Verification:** Validated the fix with `src/services/__tests__/gemini.test.ts` and confirmed all frontend tests pass.
  - **Files Modified:** `src/services/gemini.ts`.

- **Comprehensive Dead Code Cleanup (Jan 17, 2026):**
  - **File Deletion:** Removed 8 dead files including legacy Auth components (`OTPInput`, `PhoneInput`), unused shared components (`Alert`, `Input`, `CustomHeader`), legacy storage services (`storageService`, `storageLoader`), and the obsolete `slotExtractor.ts`.
  - **Active Code Refinement:** Eliminated unused imports, variables, and state in 10+ active files (`ClinicalNoteScreen`, `SymptomAssessmentScreen`, `CheckSymptomScreen`, `StandardHeader`, etc.) as identified by static analysis.
  - **Backend Consolidation:** Created `backend/src/utils/constants.ts` to centralize `VALID_SERVICES`, removing redundancy in `aiService.ts`.
  - **Navigation Fix:** Corrected a bug in `StandardHeader.tsx` where `handleBackPress` used the wrong reference for `backRoute` navigation.
  - **Migration Cleanup:** Refactored Redux Persist migrations in `src/store/index.ts` to use a cleaner `delete` strategy for legacy state purging.
  - **Linting Compliance:** Achieved a significant reduction in ESLint warnings (from 42 down to 22), focusing on reachable production code.

- **Clinical Saturation Logic (Jan 20, 2026):**
  - **Early Termination:** Implemented logic to allow the assessment to close early if the clinical picture is "saturated" (complete and stable), even if the minimum turn floor hasn't been met.
  - **Stability Tracking:** Updated `TriageArbiter` to track `saturation_count` by comparing clinical slots (Age, Duration, Severity, etc.) across consecutive turns.
  - **Termination Condition:** A `TERMINATE` signal is now issued if `triage_readiness_score` is 1.0 AND the profile has been stable for at least 2 turns.
  - **UI Integration:** Modified `SymptomAssessmentScreen` to maintain `previousProfile` and `saturationCount` state and pass them to the arbiter, respecting the new override condition.
  - **Verification:** Validated with a dedicated test suite `tests/TriageArbiterSaturation.test.ts`.
  - **Files Modified:** `src/services/triageArbiter.ts`, `src/screens/SymptomAssessmentScreen.tsx`.

- **Confidence Signaling & Conservative Triage Transparency (Jan 21, 2026):**
  - **New Component:** Created `ConfidenceSignal.tsx` to transparently communicate when a conservative triage fallback is applied. Uses a subtle `Surface` layout with `MaterialCommunityIcons`.
  - **UI Integration:** Integrated the signal into `RecommendationScreen.tsx`, appearing only when `is_conservative_fallback` is true in the assessment response.
  - **Messaging:** Displays a reassuring "Safety Note" explaining that a slightly higher level of care was recommended due to symptom complexity or vagueness.
  - **Accessibility:** Implemented proper accessibility roles and labels for the signal component.
  - **Verification:** Added unit tests for the component and integration tests for the conditional rendering logic.
  - **Files Created/Modified:** `src/components/features/navigation/ConfidenceSignal.tsx`, `src/screens/RecommendationScreen.tsx`, `tests/ConfidenceSignalIntegration.test.tsx`.

- **Safety Check Behavior (Jan 23, 2026):**
  - **Refined Trigger:** Modified `App.tsx` to remove the `AppState` listener that triggered the "Safety Check" modal on app resume (background -> active).
  - **New Behavior:** The safety modal now only appears on the initial app launch (cold start) if the user is flagged as high risk, preventing accidental triggers when briefly switching apps or locking the screen.
  - **Files Modified:** `App.tsx`.
