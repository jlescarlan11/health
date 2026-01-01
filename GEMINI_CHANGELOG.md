# Emergency Detection Service Implementation

## Features Implemented
1.  **Emergency Detector Service (`src/services/emergencyDetector.ts`)**:
    *   Implements keyword-based detection using `assets/medical-knowledge.json` keywords.
    *   Calculates severity score (0-10).
    *   Flags as **EMERGENCY** if score > 7.
    *   Returns an `overrideResponse` for immediate UI handling.

2.  **Symptom Assessment Integration (`src/screens/SymptomAssessmentScreen.tsx`)**:
    *   Added real-time check in `handleNext`.
    *   If an emergency is detected in the user's answer, it **immediately terminates** the flow.
    *   Navigates to `Recommendation` screen with partial data.

3.  **Recommendation Handling (`src/screens/RecommendationScreen.tsx`)**:
    *   Existing logic correctly prioritizes local emergency detection over AI analysis.
    *   Displays urgent emergency banner and hospital buttons.

## Verification
*   **Tests**: Created `src/services/__tests__/emergencyDetector.test.ts` covering:
    *   High severity keywords (Score 10).
    *   Moderate severity keywords (Score 8).
    *   Non-emergency symptoms.
    *   Multiple keywords (Max score).
    *   Case insensitivity.
*   **Manual Check**: Verified the flow conceptually: User types "chest pain" -> `handleNext` detects it -> Navigates to Recommendation -> Recommendation shows Emergency UI -> No Gemini API call made.
