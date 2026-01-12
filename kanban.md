# Kanban Board - Yakap UI/UX Improvements

## Todo

### Streamline Enrollment Actions
- **Task**: Simplify the user journey by removing redundant eligibility checks and strengthening the primary call-to-action.
    - **Subtask**: Locate `src/features/yakap/YakapHomeScreen.tsx` and identify the bottom action buttons section.
    - **Subtask**: Remove the "Check Eligibility" button (`Button` with `icon="check-decagram"`) and its associated `onPress` handler if no longer used.
    - **Subtask**: Locate the "How to Enroll" CTA card in the same file.
    - **Subtask**: Update the button text from "View Enrollment Guide" to "Start Enrollment Guide" to imply immediate action.

### Refactor Key Benefits Layout
- **Task**: Improve the discoverability of program benefits by replacing the horizontal scroll with a vertical layout.
    - **Subtask**: Modify the "Key Benefits" section in `src/features/yakap/YakapHomeScreen.tsx`.
    - **Subtask**: Remove the `ScrollView` component wrapping the benefit cards (specifically the `horizontal` prop).
    - **Subtask**: Change the container style to use a 2-column grid layout (e.g., `flexDirection: 'row'`, `flexWrap: 'wrap'`).
    - **Subtask**: Update `styles.benefitCard` to remove the fixed width of `200px` and instead use a percentage-based width (e.g., `48%`) or `flex: 1` with margins.
    - **Subtask**: Adjust `styles.benefitCard` height if necessary to accommodate wrapped text in a vertical layout.
    - **Subtask**: Ensure proper spacing (gap/margin) between cards in the new grid layout.
