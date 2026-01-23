import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { MainHomeScreen } from '../src/screens/MainHomeScreen';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockNavigate,
  }),
  useFocusEffect: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('MainHomeScreen', () => {
  // Create a mock icon component for PaperProvider
  const MockIcon = ({ name, size, color }: any) =>
    React.createElement('Icon', { name, size, color });

  const component = (
    <Provider store={store}>
      <SafeAreaProvider>
        <PaperProvider settings={{ icon: MockIcon }}>
          <NavigationContainer>
            <MainHomeScreen />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </Provider>
  );

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(component);

    expect(getByText('Kumusta!')).toBeTruthy();
    expect(getByText('Check Symptoms')).toBeTruthy();
    expect(getByText('Find Facilities')).toBeTruthy();
    expect(getByText('YAKAP Enrollment')).toBeTruthy();
  });

  it('navigates to AiChat when Check Symptoms is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('Check Symptoms'));
    expect(mockNavigate).toHaveBeenCalledWith('Check', { screen: 'CheckSymptom' });
  });

  it('navigates to FacilityDirectory when Find Facilities is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('Find Facilities'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'Find',
      expect.objectContaining({ screen: 'FacilityDirectory' }),
    );
  });

  it('navigates to YakapHome when YAKAP Enrollment is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('YAKAP Enrollment'));
    expect(mockNavigate).toHaveBeenCalledWith('YAKAP', { screen: 'YakapHome' });
  });
});
