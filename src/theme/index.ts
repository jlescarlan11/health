import { MD3LightTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

// User defined palette
const palette = {
  background: '#EDF2F4', // Deeper, cooler neutral for better contrast
  yellow: '#F7DB50',
  green: '#379777',
  dark: '#45474B',
  // New additions for better contrast
  lightGreen: '#E8F5F1',
  mint: '#D4EDE4',
  softTeal: '#B8E6D5',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    // Primary - Using Green
    primary: palette.green,
    onPrimary: '#FFFFFF',
    primaryContainer: palette.lightGreen, // Very light green
    onPrimaryContainer: palette.dark,

    // Secondary - Using Yellow as accent
    secondary: palette.yellow,
    onSecondary: palette.dark,
    secondaryContainer: palette.mint, // mint instead of light yellow
    onSecondaryContainer: palette.dark,

    // Tertiary - For alternative accent areas
    tertiary: '#5B9279', // Muted green
    onTertiary: '#FFFFFF',
    tertiaryContainer: palette.softTeal, // Soft teal for variety
    onTertiaryContainer: palette.dark,

    // Backgrounds
    background: palette.background,
    onBackground: palette.dark,

    // Surface
    surface: '#FFFFFF',
    onSurface: palette.dark,
    surfaceVariant: '#E0E2E3',
    onSurfaceVariant: palette.dark,

    // Borders
    outline: '#C5C7C8',
    outlineVariant: '#E0E2E3',

    // Elevation/Shadow
    shadow: '#000000',
    scrim: '#000000',

    // Error
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
  },
};

export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    background: palette.background,
    primary: palette.green,
    card: '#FFFFFF',
    text: palette.dark,
    border: '#E0E2E3',
  },
};
