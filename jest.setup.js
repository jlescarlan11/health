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