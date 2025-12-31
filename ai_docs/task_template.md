# TASK TEMPLATE

---

## Task ID

[Unique identifier: e.g., TASK-001]

---

## Task Title

[Clear, specific name for the task]

---

## Objective

[One sentence describing what needs to be accomplished]

---

## Context

[Brief explanation of where this fits in the app - which screen, feature, or flow]

---

## Functional Requirements

**What this feature/component must do:**

- Requirement 1
- Requirement 2
- Requirement 3

---

## User Interactions

**How users will interact with this feature:**

- Action 1 → Expected result
- Action 2 → Expected result
- Edge case interaction → Expected behavior

---

## Technical Details

**Components/Files to Create or Modify:**

- Component 1: `[filepath]` - [purpose]
- Component 2: `[filepath]` - [purpose]

**Data Structure:**

```typescript
// Define interfaces/types needed
interface IExampleData {
  id: string;
  name: string;
  // ...
}
```

**APIs/Endpoints:**

- Endpoint 1: `[method] [url]` - [purpose]
- Endpoint 2: `[method] [url]` - [purpose]

**Dependencies:**

- External library 1: `[package-name]` - [why needed]
- Internal dependency: `[component/service]` - [why needed]

---

## UI/UX Specifications

**Layout Description:**
[Describe the visual layout, or reference design file]

**Components Needed:**

- Button (primary action)
- Input field (text/number/etc.)
- Card component
- [etc.]

**Styling Requirements:**

- Colors: [Specify from COLORS constant]
- Spacing: [Specify from SPACING constant]
- Typography: [Font size, weight]
- Responsive behavior: [Mobile/tablet considerations]

**Mockup/Design Reference:**
[Link to Figma/design file, or describe layout]

---

## Acceptance Criteria

**This task is complete when:**

- [ ] Criterion 1: [Specific, measurable condition]
- [ ] Criterion 2: [Specific, measurable condition]
- [ ] Criterion 3: [Specific, measurable condition]
- [ ] All TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Accessibility attributes added
- [ ] Component follows naming conventions
- [ ] Code passes linting and type checking

---

## Edge Cases & Error Handling

**Scenarios that need special handling:**

- Edge case 1 → How to handle
- Error condition 1 → Expected behavior (user-friendly message)
- Network failure → Show error, allow retry
- Empty state → Display appropriate message

---

## Testing Checklist

**Manual Testing:**

- [ ] Test Case 1: [Description]
- [ ] Test Case 2: [Description]
- [ ] Test on Android device/emulator
- [ ] Test on iOS device/simulator
- [ ] Test with screen reader (TalkBack/VoiceOver)
- [ ] Test with poor/no network connection

**Unit Tests Required:**

- [ ] Test 1: [What to test]
- [ ] Test 2: [What to test]

---

## Constraints & Limitations

**Any restrictions or boundaries:**

- Technical constraint 1
- Business rule constraint 1
- Performance requirement 1
- API rate limit considerations

---

## Dependencies & Blockers

**This task depends on:**

- [ ] Task ID: [ID] - [Brief description]
- [ ] Design approval for [screen/component]
- [ ] API endpoint [name] to be ready

**Potential blockers:**

- Blocker 1: [Description and mitigation plan]
- Blocker 2: [Description and mitigation plan]

---

## Additional Notes

[Any special considerations, security concerns, performance optimizations, or other relevant information]

---

## References

- **GEMINI.md Section:** [Link to relevant section in GEMINI.md]
- **Related Tasks:** [TASK-XXX, TASK-YYY]
- **External Documentation:** [Links to external docs if needed]

---

**⚠️ IMPORTANT: This task must follow ALL coding standards, guidelines, and best practices defined in GEMINI.md**

---

**Assigned To:** [Developer name]  
**Priority:** [Low / Medium / High / Critical]  
**Estimated Time:** [Hours/Days]  
**Status:** [Not Started / In Progress / In Review / Completed]  
**Created:** [Date]  
**Last Updated:** [Date]
