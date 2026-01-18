# Kanban Board: AI Symptom Checker & Triage Improvements (Feature 1)

This board outlines the tasks required to implement the approved improvements for the AI Symptom Checker. All tasks are derived from the code analysis and specific recommendations for Feature 1.

## 1. To Do

### High Priority: Safety & Accuracy

- [ ] **Enhance `extractClinicalSlots` with Severity & Temperature**
    *   **Goal:** Enable the system to capture pain scores (e.g., "7/10"), temperatures (e.g., "39C"), and qualitative terms ("severe", "mild") from user input to improve pruning and scoring.
    *   **Files:** `src/utils/clinicalUtils.ts`
    *   **Subtasks:**
        - [ ] Add `SEVERITY_REGEX` to capture numeric scales (`/\b([1-9]|10)\s*\/\s*10\b/`) and qualitative terms (`mild`, `moderate`, `severe`, etc.).
        - [ ] Add `TEMPERATURE_REGEX` to capture values with units (`/\b(\d{2}(\.\d)?)\s*(degrees?|°|c|f)\b/i`).
        - [ ] Update `extractClinicalSlots` function to return `severity` and `temperature` fields in the output object.
        - [ ] Update return type `ClinicalSlots` to include these new optional fields.
        - [ ] Add unit tests for `extractClinicalSlots` covering new severity and temperature patterns.

- [ ] **Implement Dynamic Pruning for Severity**
    *   **Goal:** Prevent the AI from asking "How severe is it?" if the user already provided that information (e.g., "I have a severe headache").
    *   **Files:** `src/screens/SymptomAssessmentScreen.tsx`
    *   **Subtasks:**
        - [ ] In `initializeAssessment`, inside the pruning filter loop, check if `slots.severity` exists.
        - [ ] If `q.id === 'severity'` and `slots.severity` is present:
            - [ ] Populate `initialAnswers['severity']` with the extracted value.
            - [ ] Return `false` to remove the question from the plan.
        - [ ] Log the pruning action for debugging (`[Assessment] Pruning severity. Found: ...`).

- [ ] **Implement Context-Aware Emergency Detection**
    *   **Goal:** Prevent "Viral De-escalation" (lowering urgency for cold symptoms) when the user is answering a critical "Red Flag" question, ensuring critical answers are treated with maximum weight.
    *   **Files:** `src/services/emergencyDetector.ts`, `src/screens/SymptomAssessmentScreen.tsx`
    *   **Subtasks:**
        - [ ] Update `EmergencyDetectionOptions` interface in `src/services/emergencyDetector.ts` to include optional `questionId?: string`.
        - [ ] In `evaluate`, add logic to skip the viral score modifier (de-escalation) if `options.questionId` matches `'red_flags'` or `'q_emergency_signs'`.
        - [ ] In `SymptomAssessmentScreen.tsx`, update the `detectEmergency` call in `handleNext` to pass `currentQ.id` as `questionId`.

- [ ] **Harden "Authority Block" Validation**
    *   **Goal:** Improve the safety check that allows downgrading AI emergencies. Ensure that when a user denies red flags, it is a *true* negation, not a false positive match.
    *   **Files:** `src/api/geminiClient.ts`
    *   **Subtasks:**
        - [ ] Import `isNegated` from `src/services/emergencyDetector.ts`.
        - [ ] In `assessSymptoms` (Authority Block section), replace the simple `includes` check for denials.
        - [ ] Implement logic to verify the denial string is a negation (e.g., check `!isNegated(denials, <flag>).hasAffirmation` or check for explicit denial prefixes like `no`, `none`, `wala`).
        - [ ] Add logging to confirm when Authority Block is effectively triggered or bypassed due to validation.

### Medium Priority: Resilience & UX

- [ ] **Implement Smart Fallback via Local Scoring**
    *   **Goal:** Provide a safer fallback recommendation if the Gemini API fails. Instead of defaulting to "Health Center," use the local `emergencyDetector` score to decide between "Health Center" and "Hospital."
    *   **Files:** `src/screens/RecommendationScreen.tsx`
    *   **Subtasks:**
        - [ ] In `analyzeSymptoms` `catch` block, call `detectEmergency` on the concatenated user answers + symptoms.
        - [ ] Implement logic: If `fallbackScan.score >= 5`, set `fallbackLevel = 'hospital'` and update advice text.
        - [ ] Otherwise, default to `'health_center'` (existing behavior).
        - [ ] Update the `setRecommendation` call to use these dynamic fallback values.

- [ ] **Add "Expansion Mode" User Feedback**
    *   **Goal:** Explain to the user why more questions are being asked when the assessment extends beyond the original plan (Expansion Mode), improving trust.
    *   **Files:** `src/screens/SymptomAssessmentScreen.tsx`
    *   **Subtasks:**
        - [ ] Locate the `arbiterResult` handling block where `currentExpansion < MAX_EXPANSIONS`.
        - [ ] Before fetching new questions, insert a system message into the chat: `"I need to clarify just a few more specific details to be sure about your safety..."`.
        - [ ] Verify this message appears naturally before the new questions stream in.

## 2. In Progress
*(No tasks currently in progress)*

## 3. Done
*(No tasks completed yet)*

## 4. Backlog (Future Consideration)
- **Voice Input feedback loop:** Provide visual confidence feedback during voice recording in `InputCard`.
- **Offline Triage Sync:** Sync locally generated offline triage results with the server once connection is restored.
