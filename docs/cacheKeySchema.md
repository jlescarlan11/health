# Gemini Cache Key Schema

## Included fields

- `initialSymptom` (derived from `symptomsRef.current`, `src/screens/RecommendationScreen.tsx:317-319`): use the user-facing complaint string as the primary key input. Normalize it by trimming leading/trailing whitespace, collapsing repeated whitespace sequences, and lower-casing the result so semantically identical phrasings map to the same value.
- `resolvedTag` (based on `profile.is_recent_resolved`/`profile.resolved_keyword`, `src/screens/RecommendationScreen.tsx:300-304`): capture whether the profile is categorized as a recent-resolved case plus the keyword used for the tag. Represent it canonically as `resolved=true|keyword` or `resolved=false` so the tag’s presence (and associated reasoning) saturates the cache key.
- `profileSummary` (the structured slots used by `formatClinicalSummary`, `src/screens/RecommendationScreen.tsx:65-71`): include each slot data point—`age`, `duration`, `severity`, `progression`, `red_flag_denials`, and `summary`. When a slot is absent, record an explicit empty string. Serialize these fields in fixed key order to avoid collisions caused by object property iteration order.
- `triageFlags` (the readiness/fallback cues that control prompt depth, `src/screens/RecommendationScreen.tsx:322-332`): include the raw `profile.triage_readiness_score` (or `null`) and a boolean for whether the profile qualifies as a fallback (`isFallbackProfile` conditions). Those flags deterministically determine when additional raw history is appended to prompts, so the cache key must treat low readiness/fallback profiles as distinct from otherwise identical complaints that scored high readiness.
- `emergencyIndicator` (the result of `detectEmergency` with `isEmergency`, `src/api/geminiClient.ts:387-422`): do not record this field in the cached key because the client bypasses caching whenever `detectEmergency` returns `isEmergency=true` and instead re-runs the request with safety overrides. The skip itself is the safety mechanism, so encoding the indicator is unnecessary.

## Excluded fields

- `distanceContext` (the nearest health center/hospital distances in `RecommendationScreen.tsx:289-300`): these values vary with user location, facility availability, and rounding. They are only used for user-facing context and do not affect triage logic, so excluding them keeps cache hits focused on the clinical narrative.
- `Raw History for analysis` (`JSON.stringify(answersRef.current)`, `RecommendationScreen.tsx:328-330`): the raw, user-specific answer list changes whenever the user edits their answers. Including it would create nearly unique keys for each interaction. Instead, rely on the structured profile fields that summarize the same history but change far less often.
- UI/formatting helpers such as distance labels, display-only strings, or derived advice text: they are presentation-layer artifacts and do not influence the stored assessment, so they are not part of the cache key.

## Normalization & Construction

1. Build a canonical payload object with the fields above in the exact order: `initialSymptom`, `resolvedTag`, `profileSummary`, `triageFlags`. Each subfield is a primitive (string/number/boolean), with missing values replaced by the empty string or `null`.
2. Normalize every string by trimming whitespace, collapsing multiple spaces, and lower-casing (for symptom/resolved-tag text). `profileSummary` slots do not require lower-case but should be trimmed to remove stray spaces.
3. Serialize the payload with `JSON.stringify` so key order is stable, then feed the resulting string into the existing `getCacheKey` hash step. This yields deterministic keys that align with the current cache implementation (`src/api/geminiClient.ts:125-138`) without depending on volatile UI cues.

## Justification

Keeping the cache key limited to the above stable clinical inputs ensures that repeated assessments for the same complaint, same extracted profile, and same safety-readiness state will reuse cached Gemini responses, while any change to those fields (new symptom phrasing, updated profile slot, readiness dip, resolved-tag state) invalidates the key. Volatile UI-only signals like distances or raw answers remain excluded to prevent unnecessary cache fragmentation. Safety-triggered overrides such as `detectEmergency` already skip caching, so no additional signals are required.
