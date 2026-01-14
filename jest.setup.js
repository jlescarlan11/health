import '@testing-library/jest-native/extend-expect';

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
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
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

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    MaterialCommunityIcons: ({ name, size, color, ...props }) =>
      React.createElement('Icon', { name, size, color, ...props }),
  };
});

// Mock react-native-vector-icons - return a proper component
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  return ({ name, size, color, ...props }) =>
    React.createElement('Icon', { name, size, color, ...props });
});

// Cleanup after all tests
afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
