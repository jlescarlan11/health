# Accessibility Checklist

## General
- [ ] **Touch Targets**: Ensure all interactive elements (buttons, links, inputs) have a minimum size of 44x44 points.
- [ ] **Color Contrast**: Verify that text has a contrast ratio of at least 4.5:1 against its background.
- [ ] **Text Scaling**: Ensure that the UI adapts correctly when the user increases font size in system settings.

## Screen Reader (TalkBack/VoiceOver)
- [ ] **Labels**: All interactive elements must have a meaningful `accessibilityLabel`.
    - [ ] `TouchableOpacity`, `Pressable`, `TouchableHighlight`
    - [ ] `TextInput`
    - [ ] Icons acting as buttons
- [ ] **Hints**: Use `accessibilityHint` for elements where the action is not obvious from the label alone.
- [ ] **Roles**: specific `accessibilityRole` (e.g., 'button', 'header', 'link', 'image') should be set for all interactive elements.
- [ ] **Images**: All informational images must have an `accessibilityLabel` or `alt` text. Decorative images should have `accessibilityRole="none"` or be hidden from accessibility services.
- [ ] **Grouping**: Related text elements (e.g., a card with title and description) should be grouped using `accessible={true}` on the container to be read as a single unit.
- [ ] **Order**: Verify that the reading order (traversal order) follows the visual layout logical flow.

## specific Components
- [ ] **Forms**: Inputs should have labels associated with them (programmatically or visually).
- [ ] **Modals**: Focus should be trapped within the modal when it is open.
- [ ] **Loading States**: Use `accessibilityLiveRegion` or standard loading indicators to announce status changes.
- [ ] **Errors**: Error messages should be announced automatically or be easily discoverable.

## Testing
- [ ] Test with **TalkBack** (Android).
- [ ] Test with **VoiceOver** (iOS).
- [ ] Test with large text settings enabled.