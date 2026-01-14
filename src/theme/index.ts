import { MD3LightTheme } from 'react-native-paper';

// User defined palette
const palette = {
  background: '#F5F7F8',
  yellow: '#F4CE14',
  green: '#379777',
  dark: '#45474B',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    // Primary - Using Green as it's safe for text and branding
    primary: palette.green,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F5F1', // A very light version of green for containers
    onPrimaryContainer: palette.dark,

    // Secondary - Using Yellow as accent
    secondary: palette.yellow,
    onSecondary: palette.dark, // Dark text on yellow for contrast
    secondaryContainer: '#FFFDE7', // Very light yellow
    onSecondaryContainer: palette.dark,

    // Backgrounds
    background: palette.background,
    onBackground: palette.dark,

    // Surface
    surface: '#FFFFFF', // Keep cards white for depth against #F5F7F8 background
    onSurface: palette.dark,
    surfaceVariant: '#E0E2E3', // Slightly darker than background for inputs/dividers
    onSurfaceVariant: palette.dark,

    // Text (Outline/Borders)
    outline: '#E0E2E3', // Light gray for standard borders
    outlineVariant: '#E0E2E3', // Light gray for subtle borders/dividers

    // Elevation/Shadow
    shadow: '#000000',
    scrim: '#000000',

    // Error (Functional - kept standard red or similar)
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
  },
};
