import '@testing-library/jest-native/extend-expect';
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock @react-native-voice/voice
jest.mock('@react-native-voice/voice', () => ({
  onSpeechResults: jest.fn(),
  onSpeechError: jest.fn(),
  onSpeechVolumeChanged: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  removeAllListeners: jest.fn(),
}));

// Mock NativeModules.Voice for SpeechService
const { NativeModules } = require('react-native');
const { Animated } = require('react-native');
NativeModules.Voice = {
  startSpeech: jest.fn(),
  stopSpeech: jest.fn(),
  cancelSpeech: jest.fn(),
  destroySpeech: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Avoid async animation timers triggering act warnings in tests
Animated.timing = (value, config) => ({
  start: jest.fn(),
  _isUsingNativeDriver: () => false,
  stop: jest.fn(),
  reset: jest.fn(),
});

Animated.spring = (value, config) => ({
  start: jest.fn(),
  _isUsingNativeDriver: () => false,
  stop: jest.fn(),
  reset: jest.fn(),
});

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  manifest: {
    extra: {
      apiUrl: 'http://localhost:3000',
    },
  },
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:3000',
    },
  },
}));

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(),
  Platform: {
    OS: 'ios',
    select: (objs) => objs.ios || objs.default,
  },
}));

// Set global process.env.EXPO_OS
process.env.EXPO_OS = 'ios';

// Silence react-native-paper icon warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Tried to use the icon') ||
      args[0].includes('none of the required icon libraries are installed'))
  ) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('not wrapped in act')
  ) {
    return;
  }
  originalError(...args);
};

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props),
  };
});

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabase: () => ({
    transaction: () => {},
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    type: 'unknown',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
    },
  }),
  fetch: jest.fn(() =>
    Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
      },
    }),
  ),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 13.6218,
        longitude: 123.1948,
        accuracy: 5,
        altitude: 0,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    }),
  ),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: {
    Balanced: 3,
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 0, height: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    SafeAreaContext: React.createContext(insets),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    initialWindowMetrics: {
      frame,
      insets,
    },
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const Icon = ({ name, size, color, ...props }) =>
    React.createElement('Icon', { name, size, color, ...props });
  return {
    MaterialCommunityIcons: Icon,
    MaterialIcons: Icon,
    Ionicons: Icon,
    Feather: Icon,
    FontAwesome: Icon,
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  return ({ name, size, color, ...props }) =>
    React.createElement('Icon', { name, size, color, ...props });
});

// Mock react-native-paper MaterialCommunityIcon to prevent loading modules
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  const React = require('react');
  const { View } = require('react-native');

  // Helper to render a mock icon
  const MockIcon = ({ name, color, size, style }) =>
    React.createElement('Icon', { name, color, size, style });

  return {
    ...actual,
    // Override components that use icons internally if needed,
    // but usually mocking the internal MaterialCommunityIcon is enough if we get the path right.
    // Let's try mocking the internal one again with a more reliable path or just mock the ones we use.
  };
});

// A more reliable way to mock the internal icon component of react-native-paper
jest.mock(
  'react-native-paper/src/components/MaterialCommunityIcon',
  () => {
    const React = require('react');
    return (props) => React.createElement('Icon', props);
  },
  { virtual: true },
);

jest.mock(
  'react-native-paper/lib/commonjs/components/MaterialCommunityIcon',
  () => {
    const React = require('react');
    return (props) => React.createElement('Icon', props);
  },
  { virtual: true },
);

// Mock react-native-vector-icons - return a proper component
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  return ({ name, size, color, ...props }) =>
    React.createElement('Icon', { name, size, color, ...props });
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

// Cleanup after all tests
afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

afterEach(() => {
  jest.clearAllTimers();
});
