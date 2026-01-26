import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HealthProfileEditScreen } from '../src/screens/HealthProfileEditScreen';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';
import profileReducer from '../src/store/profileSlice';
import settingsReducer from '../src/store/settingsSlice';
import { NavigationContainer } from '@react-navigation/native';

describe('HealthProfileEditScreen', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        profile: profileReducer,
        settings: settingsReducer,
      } as any,
      preloadedState: {
        profile: {
          fullName: 'Juan Dela Cruz',
          dob: '1990-01-01',
          bloodType: 'O+',
          philHealthId: '123456789012',
        },
        settings: {
          specializedModes: {
            isSenior: false,
            isPWD: false,
            isChronic: false,
          },
        },
      } as any,
    });
    store.dispatch = jest.fn(store.dispatch);
  });

  const renderScreen = () =>
    render(
      <Provider store={store}>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <HealthProfileEditScreen />
          </NavigationContainer>
        </PaperProvider>
      </Provider>,
    );

  it('renders initial profile data', () => {
    const { getByDisplayValue } = renderScreen();
    expect(getByDisplayValue('Juan Dela Cruz')).toBeTruthy();
    expect(getByDisplayValue('1990-01-01')).toBeTruthy();
    expect(getByDisplayValue('O+')).toBeTruthy();
    expect(getByDisplayValue('123456789012')).toBeTruthy();
  });

  it('updates profile data on save', () => {
    const { getByDisplayValue, getByText } = renderScreen();

    fireEvent.changeText(getByDisplayValue('Juan Dela Cruz'), 'Jane Doe');
    fireEvent.press(getByText('Save'));

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'profile/updateProfile',
        payload: expect.objectContaining({
          fullName: 'Jane Doe',
        }),
      }),
    );
  });
});
