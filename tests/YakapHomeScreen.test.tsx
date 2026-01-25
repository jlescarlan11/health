import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import YakapHomeScreen from '../src/features/yakap/YakapHomeScreen';
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
  }),
}));

describe('YakapHomeScreen', () => {
  const MockIcon = ({ name, size, color }: any) =>
    React.createElement('Icon', { name, size, color });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider settings={{ icon: MockIcon }}>
            <NavigationContainer>
              <YakapHomeScreen />
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
    const { getByText } = renderComponent();

    expect(getByText('YAKAP Program')).toBeTruthy();
    expect(getByText('My Digital ID')).toBeTruthy();
    expect(getByText('Start Enrollment Guide')).toBeTruthy();
  });

  it('navigates to Profile when Digital ID is pressed', () => {
    const { getByText } = renderComponent();
    fireEvent.press(getByText('My Digital ID'));
    expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'Profile' });
  });

  it('navigates to EligibilityChecker when Start Enrollment Guide is pressed', () => {
    const { getByText } = renderComponent();
    fireEvent.press(getByText('Start Enrollment Guide'));
    expect(mockNavigate).toHaveBeenCalledWith('EligibilityChecker');
  });
});
