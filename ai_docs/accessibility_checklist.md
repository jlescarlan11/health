# Accessibility Testing Checklist

## Visual Accessibility
- [ ] **Contrast**: Text and background color contrast ratio should be at least 4.5:1 for normal text and 3:1 for large text.
- [ ] **Touch Targets**: All interactive elements (buttons, links, inputs) must be at least 44x44 points/pixels.
- [ ] **Scaling**: Text should scale properly when the user changes font size settings in the OS.
- [ ] **Color Independence**: Color should not be the only means of conveying information (e.g., use icons or text labels along with color for errors).

## Screen Reader Accessibility (VoiceOver/TalkBack)
- [ ] **Focus Order**: Elements should be focused in a logical order (usually left-to-right, top-to-bottom).
- [ ] **Grouping**: Related elements (e.g., a card with title, subtitle, and icon) should be grouped into a single focusable element if they perform a single action.
- [ ] **Labels (accessibilityLabel)**:
    - [ ] All interactive elements have descriptive labels.
    - [ ] Labels are concise and do not include the element type (e.g., "Submit", not "Submit Button").
    - [ ] Images that convey information have labels; decorative images are ignored or have empty labels.
- [ ] **Hints (accessibilityHint)**: Complex actions have hints explaining what happens when interacted with (e.g., "Double tap to open settings").
- [ ] **Roles (accessibilityRole)**: Elements have correct roles (button, link, header, search, image, etc.).
- [ ] **Values (accessibilityValue)**: Sliders, progress bars, and toggle switches announce their current value/state.
- [ ] **State**: Disabled or selected states are announced correctly.

## Interaction
- [ ] **Gestures**: Custom gestures (swipes, pinches) have alternative accessible actions (e.g., buttons).
- [ ] **Time Limits**: Users are given enough time to interact with content, or time limits can be extended.
- [ ] **Error Handling**: Form errors are announced immediately and focus moves to the error or the field.

## Testing Tools
- [ ] **Android Accessibility Scanner**: Run the scanner on key screens.
- [ ] **TalkBack (Android)**: Manually navigate the app with eyes closed (or screen off).
- [ ] **VoiceOver (iOS)**: Manually navigate the app with screen curtain on.
