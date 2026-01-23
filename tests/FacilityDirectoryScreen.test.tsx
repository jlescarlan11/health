import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FacilityDirectoryScreen } from '../src/features/facilities/FacilityDirectoryScreen';
import { useUserLocation } from '../src/hooks';
import { Linking } from 'react-native';

// Mocks
jest.mock('../src/hooks', () => ({
  useUserLocation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: {} }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock('../src/components/features/facilities', () => ({
  FacilityListView: ({ ListHeaderComponent }: { ListHeaderComponent: React.ReactNode }) => <>{ListHeaderComponent}</>,
}));

jest.mock('../src/components/common/StandardHeader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => React.createElement(View, { testID: 'StandardHeader' });
});

// Mock setFilters and fetchFacilities to avoid issues
jest.mock('../src/store/facilitiesSlice', () => ({
  fetchFacilities: jest.fn(),
  setFilters: jest.fn(),
}));

describe('FacilityDirectoryScreen Permission Banner', () => {
  const mockRequestPermission = jest.fn();
  const mockGetCurrentLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on Linking.openSettings
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  });

  it('shows "Enable" button and calls getCurrentLocation when status is undetermined', () => {
    (useUserLocation as jest.Mock).mockReturnValue({
      permissionStatus: 'undetermined',
      requestPermission: mockRequestPermission,
      getCurrentLocation: mockGetCurrentLocation,
    });

    const { getByText } = render(<FacilityDirectoryScreen />);

    const enableButton = getByText('Enable');
    expect(enableButton).toBeTruthy();

    fireEvent.press(enableButton);
    expect(mockGetCurrentLocation).toHaveBeenCalled();
  });

  it('shows "Open Settings" button and calls Linking.openSettings when status is denied', () => {
    (useUserLocation as jest.Mock).mockReturnValue({
      permissionStatus: 'denied',
      requestPermission: mockRequestPermission,
      getCurrentLocation: mockGetCurrentLocation,
    });

    const { getByText } = render(<FacilityDirectoryScreen />);

    const settingsButton = getByText('Open Settings');
    expect(settingsButton).toBeTruthy();

    fireEvent.press(settingsButton);
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('does not show banner when status is granted', () => {
    (useUserLocation as jest.Mock).mockReturnValue({
      permissionStatus: 'granted',
      requestPermission: mockRequestPermission,
      getCurrentLocation: mockGetCurrentLocation,
    });

    const { queryByText } = render(<FacilityDirectoryScreen />);

    expect(queryByText('Enable')).toBeNull();
    expect(queryByText('Open Settings')).toBeNull();
    expect(queryByText('Enable location to see the nearest facilities.')).toBeNull();
  });
});
