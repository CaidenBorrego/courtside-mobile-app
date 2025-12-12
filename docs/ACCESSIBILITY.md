# CourtSide Accessibility Guide

This document outlines the accessibility features and best practices implemented in the CourtSide mobile application.

## Overview

CourtSide is designed to be accessible to all users, including those with visual, auditory, motor, or cognitive disabilities. We follow WCAG 2.1 Level AA guidelines and platform-specific accessibility standards.

## Implemented Features

### Screen Reader Support

All interactive elements include proper accessibility labels and hints:

- **Tournament Cards**: Announce tournament name, location, dates, and status
- **Game Cards**: Announce teams, scores, game status, and start time
- **Buttons**: Clear labels indicating action (e.g., "Follow Lakers Youth")
- **Navigation**: Proper labels for all navigation elements

### Color and Contrast

- **High Contrast**: All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Dark Mode**: Full dark mode support with appropriate contrast adjustments
- **Color Independence**: Information is not conveyed by color alone

### Touch Targets

- **Minimum Size**: All interactive elements meet the minimum 44x44 point touch target size
- **Spacing**: Adequate spacing between interactive elements to prevent accidental taps
- **Visual Feedback**: Clear visual feedback for all touch interactions

### Typography

- **Scalable Text**: Respects user's system font size preferences
- **Clear Hierarchy**: Proper heading structure for screen readers
- **Readable Fonts**: System fonts optimized for readability

### Motion and Animation

- **Reduced Motion**: Respects user's reduced motion preferences
- **Optional Animations**: Loading animations can be disabled
- **No Auto-Play**: No automatically playing videos or animations

### Keyboard Navigation (Web)

- **Tab Order**: Logical tab order through interactive elements
- **Focus Indicators**: Clear visual focus indicators
- **Keyboard Shortcuts**: Common shortcuts supported where applicable

## Using Accessibility Features

### For Developers

#### Adding Accessibility Labels

```typescript
import { getGameAccessibilityLabel } from '../utils/accessibility';

<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={getGameAccessibilityLabel(
    teamA,
    teamB,
    scoreA,
    scoreB,
    status,
    startTime
  )}
  accessibilityHint="Double tap to view game details"
>
  {/* Game card content */}
</TouchableOpacity>
```

#### Using Theme Colors

```typescript
import { useTheme } from '../hooks/useTheme';

const MyComponent = () => {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
};
```

#### Loading States

```typescript
import { ListSkeleton } from '../components';

const TournamentList = () => {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <ListSkeleton count={5} />;
  }
  
  return <FlatList data={tournaments} />;
};
```

### For Users

#### iOS VoiceOver

1. Go to Settings > Accessibility > VoiceOver
2. Turn on VoiceOver
3. Use three-finger swipe to scroll
4. Double-tap to activate elements

#### Android TalkBack

1. Go to Settings > Accessibility > TalkBack
2. Turn on TalkBack
3. Swipe right/left to navigate
4. Double-tap to activate elements

#### Dark Mode

1. iOS: Settings > Display & Brightness > Dark
2. Android: Settings > Display > Dark theme
3. App automatically adapts to system preference

#### Text Size

1. iOS: Settings > Display & Brightness > Text Size
2. Android: Settings > Display > Font size
3. App respects system text size settings

## Testing Accessibility

### Manual Testing

1. **Screen Reader Testing**
   - Enable VoiceOver (iOS) or TalkBack (Android)
   - Navigate through all screens
   - Verify all elements are announced correctly
   - Check that announcements are clear and concise

2. **Color Contrast Testing**
   - Test in both light and dark modes
   - Use color contrast analyzer tools
   - Verify text is readable in all states

3. **Touch Target Testing**
   - Verify all buttons are easy to tap
   - Check spacing between interactive elements
   - Test with different hand sizes

4. **Text Scaling Testing**
   - Increase system font size to maximum
   - Verify all text is still readable
   - Check that layouts don't break

### Automated Testing

```bash
# Run accessibility tests
npm test -- --testPathPattern=accessibility
```

## Accessibility Checklist

Use this checklist when implementing new features:

- [ ] All interactive elements have accessibility labels
- [ ] Touch targets are at least 44x44 points
- [ ] Color contrast meets WCAG AA standards
- [ ] Works with screen readers (VoiceOver/TalkBack)
- [ ] Supports dark mode
- [ ] Respects reduced motion preferences
- [ ] Text scales with system font size
- [ ] Keyboard navigable (web)
- [ ] Focus indicators are visible
- [ ] Error messages are announced to screen readers
- [ ] Loading states are accessible
- [ ] Forms have proper labels and hints

## Common Patterns

### Accessible Button

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Follow Lakers Youth"
  accessibilityHint="Double tap to follow this team"
  accessibilityState={{ selected: isFollowing }}
  style={getTouchTargetStyle()}
>
  <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
</TouchableOpacity>
```

### Accessible List Item

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={getTournamentAccessibilityLabel(
    name,
    city,
    state,
    startDate,
    endDate,
    status
  )}
  onPress={handlePress}
>
  <TournamentCard tournament={tournament} />
</TouchableOpacity>
```

### Accessible Form Input

```typescript
<View>
  <Text accessibilityRole="text">Email Address</Text>
  <TextInput
    accessible={true}
    accessibilityLabel="Email address"
    accessibilityHint="Enter your email address"
    accessibilityValue={{ text: email }}
    value={email}
    onChangeText={setEmail}
  />
</View>
```

## Resources

- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS Accessibility Guidelines](https://developer.apple.com/accessibility/)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Expo Accessibility](https://docs.expo.dev/guides/accessibility/)

## Reporting Issues

If you encounter accessibility issues:

1. Document the issue with screenshots/recordings
2. Include device and OS version
3. Specify which assistive technology you're using
4. Create an issue in the project repository
5. Tag with `accessibility` label

## Future Improvements

- [ ] Add voice control support
- [ ] Implement haptic feedback for important actions
- [ ] Add audio descriptions for visual content
- [ ] Support for switch control
- [ ] Localization for screen reader announcements
- [ ] Custom accessibility settings in app
