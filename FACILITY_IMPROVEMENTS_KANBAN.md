# Facility Directory & Mapping Improvement Board

## Backlog

### Phase 1: Removal of Map View Functionality
- [ ] **Remove FacilityMapView Component**
    - Delete `src/components/features/facilities/FacilityMapView.tsx`.
    - Remove export from `src/components/features/facilities/index.ts`.
- [ ] **Clean Up Map Service**
    - Audit `src/services/mapService.ts`.
    - Remove map-specific logic (e.g., `downloadOfflineMap`, `getDirections`).
    - Keep or refactor distance calculation logic if strictly needed here, or ensure `locationUtils.ts` is the sole source.
- [ ] **Update Dependencies**
    - Uninstall `@rnmapbox/maps` from `package.json`.
    - Remove Mapbox configuration from `app.json`/`app.config.js` and `.env` (e.g., `EXPO_PUBLIC_MAPBOX_TOKEN`).
- [ ] **Refactor Navigation & Screens**
    - Remove Map View toggle/route from `FacilityDirectoryScreen.tsx`.
    - Clean up any "Map" tab or navigation references in `src/navigation/` types or navigators.

### Phase 2: Data & Synchronization Improvements ("Fetch-All")
- [ ] **Update Backend Controller**
    - Modify `backend/src/controllers/facilityController.ts` (`listFacilities`) to support a "fetch all" mode (e.g., if `limit=-1` or absent).
    - Ensure performance is acceptable for the current dataset size (~50-100 records).
- [ ] **Refactor Redux Slice (`facilitiesSlice.ts`)**
    - Modify `fetchFacilities` thunk to remove pagination params (`page`, `limit`) or set high defaults.
    - Remove `page`, `hasMore`, `total` state properties if they are no longer used for pagination.
    - Update `extraReducers` to handle the single-batch payload (replace array instead of append).
- [ ] **Update Facility Service (`facilityService.ts`)**
    - Simplify `getFacilities` to request full dataset.
    - Ensure `saveFacilitiesToDb` handles full replacement or smart upsert of the entire dataset efficiently.

### Phase 3: Search & Filtering Enhancements
- [ ] **Implement Fuzzy Service Matching**
    - Import `resolveServiceAlias` in `src/store/facilitiesSlice.ts` (or wherever filtering logic resides).
    - Update `setFilters` (or the selector) to check: `if (searchQuery matches Alias(service)) -> include facility`.
- [ ] **Verify Search Logic**
    - Ensure search checks: Name, Address, AND now *Services* (via alias matching).
    - Add unit tests for `facilitiesSlice` to verify "baby" finds "Pediatrics".

### Phase 4: Reliability & Validation
- [ ] **Implement Runtime Data Validation**
    - Install `zod` (if not present) or create a manual validator in `src/utils/validation.ts`.
    - Define schema for `Facility` and especially `OperatingHours`.
    - In `facilityService.ts` (before `saveFacilitiesToDb`), validate API response.
    - Sanitize invalid data (e.g., missing schedule arrays) to prevent UI crashes.
- [ ] **Enhance `getOpenStatus`**
    - Update `src/utils/facilityUtils.ts` to gracefully handle `null` or malformed `operatingHours`.

### Phase 5: UI & UX Improvements
- [ ] **Add "Quick Directions" to List Card**
    - Extract `openExternalMaps` from `FacilityDetailsScreen.tsx` to `src/utils/linkingUtils.ts`.
    - Update `src/components/common/FacilityCard.tsx`:
        - Add a "Directions" icon button (e.g., `MaterialCommunityIcons` name="directions").
        - Wire up `onPress` to the utility function.
- [ ] **Implement Location Permission Banner**
    - In `FacilityDirectoryScreen.tsx`:
        - Use `useUserLocation` to get `permissionStatus`.
        - If `denied` or `undetermined`, render a `Banner` or `Surface` at the top of the list.
        - Add explicit text: "Enable location to see the nearest facilities."
        - Add button to `Linking.openSettings()`.

## In Progress
*(Empty)*

## Review
*(Empty)*

## Done
*(Empty)*
