# Facility UI/UX Improvement Kanban

## Column 1: High Priority (Trust & Access)
- [ ] **Task 1: Optimize Action Hierarchy for Thumb Zone**
  - **Ref:** `src/screens/FacilityDetailsScreen.tsx`
  - **Principle:** Thumb Zone / Fitts's Law.
  - **Action:** Move "Directions" to primary `actionButtons` row.
- [ ] **Task 2: Accessibility Check for Status Meaning**
  - **Ref:** `src/components/common/FacilityCard.tsx`
  - **Principle:** WCAG 2.1 SC 1.4.1.
  - **Action:** Add icons to status indicators (Clock/Check).
- [ ] **Task 3: Standardize Emergency Visual Cue**
  - **Ref:** `src/components/common/FacilityCard.tsx`
  - **Principle:** Visual Hierarchy (Salience).
  - **Action:** Add high-contrast "24/7 EMERGENCY" badge for relevant facilities.

## Column 2: Medium Priority (Navigation & Discovery)
- [ ] **Task 4: Enable Multi-Facet Filtering**
  - **Ref:** `src/store/facilitiesSlice.ts` & `FacilityDirectoryScreen.tsx`
  - **Principle:** ISO 9241-110 (Controllability).
  - **Action:** Refactor filtering to allow multiple active facets.
- [ ] **Task 5: Implement Manual Location Fallback**
  - **Ref:** `src/hooks/useUserLocation.ts`
  - **Principle:** Graceful Degradation.
  - **Action:** Add "Select District" dropdown for approximate sorting.
- [ ] **Task 6: Group Services by Care Level**
  - **Ref:** `src/screens/FacilityDetailsScreen.tsx`
  - **Principle:** Miller's Law (Chunking).
  - **Action:** Group services into semantic sub-sections.

## Column 3: Low Priority (Polish & Reassurance)
- [ ] **Task 7: Refine Skeleton Loading for Trust**
  - **Ref:** `src/components/features/facilities/FacilityCardSkeleton.tsx`
  - **Principle:** Perceived Latency Anxiety.
  - **Action:** Match skeleton layout perfectly to `FacilityCard`.
- [ ] **Task 8: "Opening Soon" Nuance**
  - **Ref:** `src/utils/facilityUtils.ts`
  - **Principle:** Calm Design (Clarity).
  - **Action:** Return "Opens at [Time]" for facilities opening within 4 hours.
- [ ] **Task 9: Data Freshness Signal**
  - **Ref:** `src/screens/FacilityDetailsScreen.tsx`
  - **Principle:** Credibility (Trust).
  - **Action:** Add "Data verified as of [Date]" label.