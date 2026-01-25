# AI Symptom Navigator Conversational Kanban

## Backlog

- **Dialogue State Machine: Persist conversational memory across turns**
  - Technical Hook: `src/store/navigationSlice.ts:updateAssessmentState` + `src/screens/SymptomAssessmentScreen.tsx:168` (persisted assessmentState) and `handleNext` turn updates.
  - Subtasks:
    1. Introduce a session buffer abstraction that appends every user + assistant message before `updateAssessmentState` so future turns can refer to the full conversation history.
    2. Refactor `handleNext` to set a `currentTurnMeta` object (question id, timestamp, intent tag) alongside `messages`, then replay it during natural language inputs to maintain slot syncing.
    3. Ensure `clearAssessmentState` resets the buffer while `setHighRisk` and offline flows keep session metadata intact for resume capabilities.

- **Intent & Slot Mapping: Natural language → structured slots**
  - Technical Hook: `geminiClient.extractClinicalProfile` (`src/api/geminiClient.ts:665`) + `extractClinicalSlots` (`src/utils/clinicalUtils.ts:80`) used for pruning questions.
  - Subtasks:
    1. Wrap `extractClinicalSlots` in a reusable parser that is called on every incoming chat turn (not just initial symptom) so `age`, `severity`, etc. update incrementally.
    2. Feed parser output into a slot reconciliation helper that merges with the `AssessmentProfile` extracted from Gemini (current finalize path at `SymptomAssessmentScreen.tsx:1183-1192`).
    3. Mark goals (e.g., missing severity) in `questions` metadata so prompts know which slots remain unresolved.

- **Safety Interceptor Integration: Real-time triage guard**
  - Technical Hook: `detectEmergency` usage in `SymptomAssessmentScreen.tsx:530` and `geminiClient.assessSymptoms` safety overrides (`src/api/geminiClient.ts:923`).
  - Subtasks:
    1. Build a middleware that pipes every streaming user and assistant chunk through `detectEmergency` (with `historyContext`) before the next turn is enqueued, flagging `isVerifyingEmergency`.
    2. Extend `suppressedKeywords` plus a new `pendingRedFlag` state so the guard can differentiate repeated keywords vs. new threats without spamming the verification dialog (`SymptomAssessmentScreen.tsx:547-565`).
    3. Tie this guard to proactive prompts that pause the AI until emergency verification completes, preserving current question index and not discarding the turn.

- **Dynamic Prompt Engineering: Gap-driven clarifiers**
  - Technical Hook: `TriageArbiter.evaluateAssessmentState` (`src/services/triageArbiter.ts:36`) and `symptom_category` handling in `SymptomAssessmentScreen.tsx:628`.
  - Subtasks:
    1. Surface `arbiterResult.reason` and missing slot info (e.g., from `calculateTriageScore` thresholds) into a prompt palette that the new conversational LLM can use when generating the next question.
    2. Craft system prompts that instruct the LLM to ask for the absent slots first (duration/severity/progression) and to respect the minimum turns (4/7).
    3. Implement a prompt templating layer that tags each question with `tier`/`is_red_flag` so clarifiers prioritize red flags before Tier 3 diagnostics.

- **Fallback & Recovery: Manage out-of-scope utterances**
  - Technical Hook: `handleOfflineLogic` and offline triage tree (`src/screens/SymptomAssessmentScreen.tsx:1239`) plus `setMessages` showing system warnings (e.g., offline intro at `SymptomAssessmentScreen.tsx:1243`).
  - Subtasks:
    1. Detect “out-of-bounds” intents by checking if `detectEmergency` returns no keywords and `currentQuestion` still expects an answer; flag these turns and respond with a system message that gently redirects to the active question.
    2. Keep the current `Processing` state locked while the fallback response is sent, ensuring `currentQuestionIndex` is not incremented (mirrors emergency denial handling at `SymptomAssessmentScreen.tsx:1159-1172`).
    3. Log the out-of-scope input in a new `outOfScopeBuffer` state so repeated digressions trigger a friendly reminder without interrupting safety flows.

- **Verification & Logic Sync: Align chat output with triage logic**
  - Technical Hook: `finalizeAssessment` (`SymptomAssessmentScreen.tsx:1175`) + `geminiClient.assessSymptoms` fallback rules (`src/api/geminiClient.ts:1003-1300`).
  - Subtasks:
    1. After each clarified turn, re-run `calculateTriageScore` (`src/utils/aiUtils.ts:96`) to produce readiness/score/slot info and store it in state for prompt decisions.
    2. Before displaying any AI message, compare its recommendation level with the deterministic guards (red flag upgrades, readiness thresholds, recent resolved floor) and surface mismatches in the UI so the agent can mention the guardrail (e.g., “Based on the safety scanner….”).
    3. Persist `triage_logic` metadata and ensure it is referenced when translating raw data into empathetic user text (see next column).

## In Progress

- **Empathetic Response Mapping: Translate system status**
  - Technical Hook: Messages like expansion notice (`SymptomAssessmentScreen.tsx:848`), emergency confirmations (e.g., `SymptomAssessmentScreen.tsx:1122`), and `RecommendationScreen` fallback text (`src/screens/RecommendationScreen.tsx:450`).
  - Subtasks:
    1. Add a response formatter that takes `arbiterResult.reason`, `emergency.medical_justification`, or `clarificationHeader` and returns natural, empathetic strings before `setMessages`.
    2. Attach the formatter to the streaming prompt logic (`SymptomAssessmentScreen.tsx:924-980`) so JSON responses are never emitted raw.
    3. Ensure each empathetic version also includes the actionable next step (e.g., “I’m asking for clarification because…”) while still preserving the underlying data for audits.

## Testing

- **Safety Interceptor Stress Tests**
  - Technical Hook: Existing emergency keyword detector (`src/services/emergencyDetector.ts`) plus `detectMentalHealthCrisis` (`src/services/mentalHealthDetector.ts`).
  - Subtasks:
    1. Write regression test cases (using existing `__tests__` patterns) that feed streaming partial sentences and ensure the guard fires only once per new keyword.
    2. Confirm `suppressedKeywords` prevents re-alerting after a denial path (`SymptomAssessmentScreen.tsx:1160`).
    3. Validate the system doesn’t block legitimate follow-up questions when `detectEmergency` returns low scores (<7).

- **Clarification Flow Regression**
  - Technical Hook: `TriageArbiter` signals plus UI path in `SymptomAssessmentScreen.tsx:684-710`.
  - Subtasks:
    1. Simulate ambiguous denial in tests to verify the clarifier sets `isClarifyingDenial` and increments `clarificationCount`.
    2. Ensure hitting the second clarification returns to a forced question without skipping `currentQuestionIndex`.
    3. Monitor that `setIsTyping(false)`/`setProcessing(false)` are always called after a clarification cycle.

## Done

- **Offline Emergency Tree**
  - Technical Hook: `startOfflineTriage`, `handleOfflineLogic`, and `TriageEngine.processStep` (`src/screens/SymptomAssessmentScreen.tsx:1239-1295` + `src/services/triageEngine.ts`).
  - Subtasks:
    1. Triggered when network fetch fails (`initializeAssessment` catch at `SymptomAssessmentScreen.tsx:492`), setting `isOfflineMode`.
    2. Walks deterministic nodes, adds offline messages, and concludes with an offline recommendation (calls `navigation.replace('Recommendation', …)`).
    3. Maintains state via `currentOfflineNodeId` so users can pick up where they left off after reconnecting.
