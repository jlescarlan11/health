import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';
import settingsReducer from '../src/store/settingsSlice';
import profileReducer from '../src/store/profileSlice';
import { NavigationContainer } from '@react-navigation/native';

describe('SettingsScreen', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        settings: settingsReducer,
        profile: profileReducer,
      } as any,
      preloadedState: {
        settings: {
          specializedModes: {
            isSenior: false,
            isPWD: false,
            isChronic: false,
          },
        },
        profile: {
          fullName: 'Juan Dela Cruz',
          dob: '1990-01-01',
          bloodType: 'O+',
          philHealthId: '123456789012',
        },
      } as any,
    });
  });

  it('renders correctly with DigitalIDCard', () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <SettingsScreen />
          </NavigationContainer>
        </PaperProvider>
      </Provider>,
    );

    // Check for Settings title
    expect(getByText('Settings')).toBeTruthy();
    
    // Check for DigitalIDCard content
    expect(getByText('NAGA CITY HEALTH ID')).toBeTruthy();
    expect(getByText('Juan Dela Cruz')).toBeTruthy();
    
    // Check for other sections
    expect(getByText('My Account')).toBeTruthy();
    expect(getByText('Care Profile')).toBeTruthy();
  });
});
