import React from 'react';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { updateProfile } from '../src/store/profileSlice';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

// Mock KeyboardAwareScrollView
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const { ScrollView } = require('react-native');
  return {
    KeyboardAwareScrollView: ScrollView,
  };
});

describe('ProfileScreen', () => {
  const MockIcon = ({ name, size, color }: any) =>
    React.createElement('Icon', { name, size, color });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider settings={{ icon: MockIcon }}>
            <NavigationContainer>
              <ProfileScreen />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </Provider>,
    );

  beforeEach(() => {
    store.dispatch(
      updateProfile({
        fullName: null,
        dob: null,
        bloodType: null,
        philHealthId: null,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders all form fields correctly', () => {
    const { getByPlaceholderText, getByText } = renderComponent();

    expect(getByText('Your Health Profile')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Juan Dela Cruz')).toBeTruthy();
    expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    expect(getByPlaceholderText('e.g. O+')).toBeTruthy();
    expect(getByPlaceholderText('12-digit number')).toBeTruthy();
  });

  it('updates profile fields and saves to Redux', async () => {
    const { getByPlaceholderText, getByText } = renderComponent();

    const nameInput = getByPlaceholderText('e.g. Juan Dela Cruz');
    const dobInput = getByPlaceholderText('YYYY-MM-DD');
    const bloodTypeInput = getByPlaceholderText('e.g. O+');
    const philHealthIdInput = getByPlaceholderText('12-digit number');
    const saveButton = getByText('Save');

    fireEvent.changeText(nameInput, 'Juan Dela Cruz');
    fireEvent.changeText(dobInput, '1990-01-01');
    fireEvent.changeText(bloodTypeInput, 'O+');
    fireEvent.changeText(philHealthIdInput, '123456789012');

    fireEvent.press(saveButton);

    await waitFor(() => {
      const state = store.getState().profile;
      expect(state.fullName).toBe('Juan Dela Cruz');
      expect(state.dob).toBe('1990-01-01');
      expect(state.bloodType).toBe('O+');
      expect(state.philHealthId).toBe('123456789012');
    });

    expect(getByText('Profile saved successfully')).toBeTruthy();
  });

  it('loads initial data from Redux', () => {
    store.dispatch(
      updateProfile({
        fullName: 'Maria Clara',
        dob: '1995-05-05',
        bloodType: 'A-',
        philHealthId: '987654321098',
      }),
    );

    const { getByDisplayValue } = renderComponent();

    expect(getByDisplayValue('Maria Clara')).toBeTruthy();
    expect(getByDisplayValue('1995-05-05')).toBeTruthy();
    expect(getByDisplayValue('A-')).toBeTruthy();
    expect(getByDisplayValue('987654321098')).toBeTruthy();
  });

  it('renders DigitalIDCard with profile info', () => {
    store.dispatch(
      updateProfile({
        fullName: 'Juan Dela Cruz',
        dob: '1990-01-01',
        bloodType: 'O+',
        philHealthId: '123456789012',
      })
    );

    const { getByText } = renderComponent();

    expect(getByText('NAGA CITY HEALTH ID')).toBeTruthy();
    expect(getByText('Juan Dela Cruz')).toBeTruthy();
    expect(getByText('1990-01-01')).toBeTruthy();
    expect(getByText('O+ / 123456789012')).toBeTruthy();
    expect(getByText('SCAN TO VERIFY')).toBeTruthy();
  });
});
