# Facility Recommendation & Assessment Flow Improvements Kanban

## Phase 1: Ranking & Selection Logic
- [x] Update `scoreFacility` in `src/utils/facilityUtils.ts` to strictly use service alignment, distance, and operating status.
- [x] Integrate `getOpenStatus` into the scoring algorithm to prioritize open facilities.
- [x] Refine distance penalty in `scoreFacility` for better granularity.

## Phase 2: Assessment Flow Enhancements
- [x] Add a deterministic closing message in `src/screens/SymptomAssessmentScreen.tsx` within the `canTerminate` block.
- [x] Adjust `composeAssistantMessage` to ensure the final closing message is visible to the user.
- [x] Update `GENERATE_ASSESSMENT_QUESTIONS_PROMPT` in `src/constants/prompts.ts` to favor `single-select` and `multi-select` question types.
- [x] Update `DYNAMIC_CLARIFIER_PROMPT_TEMPLATE` and `REFINE_PLAN_PROMPT` to encourage structured response options.

## Phase 3: Age Logic Standardization
- [x] Update `calculateAgeFromDob` in `src/utils/clinicalUtils.ts` to use `CurrentYear - BirthYear`.
- [x] Update `parseAge` in `src/store/profileSlice.ts` to use `CurrentYear - BirthYear`.
- [x] Verify consistent usage of computed age throughout the assessment and recommendation process.

## Phase 4: Verification & Documentation
- [x] Scan codebase for any residual manual age calculations using `getFullYear`.
- [x] Verify facility ranking results on the Recommendation Screen.
- [x] Update `GEMINI.md` to reflect the new ranking criteria and age calculation logic.