## AI Symptom Checker Cost Optimization Kanban

### Discovery / Design

- **Define gating rules for per-turn extraction**
  - Source: `src/screens/SymptomAssessmentScreen.tsx:579-616`, `src/services/emergencyDetector.ts`
  - Output: documented rule table + `triageArbiter` signal mapping.
- **Pick consolidation strategy for Gemini layers**
  - Source: `src/services/gemini.ts` vs `src/api/geminiClient.ts`
  - Output: documented decision in `docs/geminiConsolidationDecision.md`.
- **Design stable cache key schema**
  - Source: cache key logic in `src/api/geminiClient.ts:125-137` and prompt context in `src/screens/RecommendationScreen.tsx:295-335`.
  - Output: schema recorded in `docs/cacheKeySchema.md`.

### Ready

- **Replace bridge generation with deterministic template**
  - Source: `BRIDGE_PROMPT` at `src/constants/prompts.ts:131-148`, bridge usage at `src/screens/SymptomAssessmentScreen.tsx:975-1045`.
- **Skip Gemini when local emergency fallback suffices**
  - Source: emergency fallback at `src/api/geminiClient.ts:396-425`.
- **Guard retries for deterministic failures**
  - Source: retry loops in `src/services/gemini.ts:113-146` and `src/api/geminiClient.ts:481-484`.
- **Prune slot extraction context**
  - Source: `extractClinicalProfile` prompt assembly at `src/services/gemini.ts:207-226`.
- **Trim expansion prompt payload**
  - Source: expansion flow at `src/screens/SymptomAssessmentScreen.tsx:839-890`.
- **Remove backend facility list from prompt**
  - Source: backend prompt at `backend/src/services/aiService.ts:34-65`.
- **Stabilize GeminiClient cache keys**
  - Source: cache key in `src/api/geminiClient.ts:125-137`, context in `src/screens/RecommendationScreen.tsx:295-335`.
- **Cache assessment plan**
  - Source: `generateAssessmentPlan` call at `src/services/gemini.ts:152-191`.
- **Cache slot extraction results**
  - Source: per-turn `extractClinicalProfile` call at `src/screens/SymptomAssessmentScreen.tsx:579-616`.
- **Refine cache cleanup**
  - Source: cleanup logic at `src/api/geminiClient.ts:271-289`.
- **Consolidate Gemini clients**
  - Source: dual stacks evidence in `src/services/gemini.ts` and `src/api/geminiClient.ts`.

### Review / QA

- **Write tests validating reduced LLM calls**
  - Source: multiple `tests/` and `src/services/__tests__` referencing Gemini flows.

### Done

(none)
