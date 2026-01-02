import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { MainHomeScreen } from '../src/screens/MainHomeScreen';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('MainHomeScreen', () => {
  // Create a mock icon component for PaperProvider
  const MockIcon = ({ name, size, color, ...props }: any) => 
    React.createElement('Icon', { name, size, color, ...props });

  const component = (
    <Provider store={store}>
      <PaperProvider settings={{ icon: MockIcon }}>
        <NavigationContainer>
          <MainHomeScreen />
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByLabelText } = render(component);

    expect(getByText('Kumusta!')).toBeTruthy();
    expect(getByText('Check Symptoms')).toBeTruthy();
    expect(getByText('Find Facilities')).toBeTruthy();
    expect(getByText('YAKAP Enrollment')).toBeTruthy();
    expect(getByLabelText('Emergency Call')).toBeTruthy();
  });

  it('navigates to AiChat when Check Symptoms is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('Check Symptoms'));
    expect(mockNavigate).toHaveBeenCalledWith('Check', { screen: 'NavigatorHome' });
  });

  it('navigates to FacilityDirectory when Find Facilities is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('Find Facilities'));
    expect(mockNavigate).toHaveBeenCalledWith('Find', { screen: 'FacilityDirectory' });
  });

  it('navigates to YakapEnrollment when YAKAP Enrollment is pressed', () => {
    const { getByText } = render(component);
    fireEvent.press(getByText('YAKAP Enrollment'));
    expect(mockNavigate).toHaveBeenCalledWith('YAKAP', { screen: 'YakapEnrollment' });
  });
});
