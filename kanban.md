# Kanban: Yakap Feature Simplification

Refactor the YAKAP enrollment feature into a purely informational, step-by-step guide. Remove all authentication, persistence, and state-saving logic to ensure a fresh experience on every visit.

## Task 1: State Management Simplification
**Goal:** Strip the Redux slice of persistent data and remove it from the persistence whitelist.

- **Task: Refactor `src/store/enrollmentSlice.ts`**
    - Subtask: Remove `enrollmentStatus`, `completedSteps`, `uploadedDocuments`, `data`, and `completionDate` from the state interface.
    - Subtask: Simplify `initialState` to only include `selectedPathway` and `currentStep`.
    - Subtask: Remove obsolete reducers: `updateEnrollmentData`, `toggleStepCompletion`, `setUploadedDocument`, `completeEnrollment`, `failEnrollment`.
    - Subtask: Keep `startEnrollment` (to set pathway), `setStep`, and `resetEnrollment`.

- **Task: Update Store Configuration in `src/store/index.ts`**
    - Subtask: Remove `'enrollment'` from the `persistConfig.whitelist` array.

## Task 2: UI Refactoring - Home Screen
**Goal:** Remove enrollment status tracking and force a fresh start.

- **Task: Refactor `src/features/yakap/YakapHomeScreen.tsx`**
    - Subtask: Remove the "Enrollment Status" card and all associated conditional rendering logic (e.g., checking `enrollmentStatus`).
    - Subtask: Simplify `navigateToEnrollment` to always call `dispatch(resetEnrollment())` and then navigate to `EligibilityChecker`.
    - Subtask: Remove the dev-mode "Reset Progress" button as it becomes redundant.
    - Subtask: Ensure the "Start Enrollment" button is always visible and labeled clearly as starting an informational guide.

## Task 3: UI Refactoring - Enrollment Guide
**Goal:** Convert the guide into a pure instruction viewer.

- **Task: Refactor `src/features/yakap/EnrollmentGuideScreen.tsx`**
    - Subtask: Remove `completedSteps` and `uploadedDocuments` from selectors.
    - Subtask: Remove document upload UI (the "Required Documents" section and upload button).
    - Subtask: Remove the "Mark this step as completed" checkbox and its logic.
    - Subtask: Remove "Save Progress" button and auto-save `useEffect` interval logic.
    - Subtask: Remove `uploadFileToFirebase` import and usage.
    - Subtask: Update `handleNext` to navigate to `EnrollmentCompletion` instead of dispatching `completeEnrollment`.

- **Task: Refactor `src/features/yakap/EnrollmentCompletionScreen.tsx`**
    - Subtask: Remove any logic that implies data was actually saved or recorded (e.g., "successfully recorded" text).
    - Subtask: Update text to focus on the informational value of having completed the guide.

## Task 4: Navigation & Flow Cleanup
**Goal:** Remove intermediate or redundant screens and ensure a smooth informational flow.

- **Task: Simplify `src/features/yakap/EligibilityCheckerScreen.tsx`**
    - Subtask: Ensure no Redux dispatch calls for persistence are present.
    - Subtask: Verify the flow correctly transitions to `EnrollmentPathway`.

- **Task: Simplify `src/features/yakap/EnrollmentPathwayScreen.tsx`**
    - Subtask: Verify `dispatch(startEnrollment(id))` only sets the pathway and doesn't trigger side effects.

- **Task: Cleanup Unused Components**
    - Subtask: Remove `src/features/yakap/YakapEnrollmentScreen.tsx` if it's no longer reachable or used.
    - Subtask: Update `src/navigation/YakapNavigator.tsx` to remove the `YakapEnrollment` screen if deleted.

- **Task: Final Verification**
    - Subtask: Run the app and verify the YAKAP flow works from start to finish without saving progress between sessions or app reloads.
    - Subtask: Check for any remaining references to authentication or user IDs in the Yakap feature and remove them.
