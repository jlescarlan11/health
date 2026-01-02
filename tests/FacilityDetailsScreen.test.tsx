import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FacilityDetailsScreen } from '../src/screens/FacilityDetailsScreen';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Linking, Share } from 'react-native';

// Mocks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-image-viewing', () => 'ImageViewing');

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
  Ionicons: 'Ionicons',
}));

// Mock Linking and Share
const mockOpenURL = jest.fn(() => Promise.resolve(true));
jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

const mockShare = jest.fn(() => Promise.resolve({ action: Share.sharedAction }));
jest.spyOn(Share, 'share').mockImplementation(mockShare);

// Mock StandardHeader since it's a custom component
jest.mock('../src/components/common/StandardHeader', () => 'StandardHeader');

describe('FacilityDetailsScreen', () => {
  const mockFacility = {
    id: '1',
    name: 'Naga City Hospital',
    type: 'Public Hospital',
    services: ['Emergency', 'Consultation'],
    address: 'Concepcion Pequeña, Naga City',
    latitude: 13.62,
    longitude: 123.19,
    phone: '09123456789',
    yakapAccredited: true,
    hours: '24/7',
    photoUrl: 'http://example.com/photo.jpg',
    operatingHours: { is24x7: true }
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: jest.fn(),
      setOptions: jest.fn(),
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { facilityId: '1' },
    });
    (useSelector as jest.Mock).mockReturnValue(mockFacility);
    
    mockOpenURL.mockClear();
    mockShare.mockClear();
  });

  it('renders facility details correctly', () => {
    const { getByText } = render(<FacilityDetailsScreen />);
    
    expect(getByText('Naga City Hospital')).toBeTruthy();
    expect(getByText('Public Hospital')).toBeTruthy();
    expect(getByText('YAKAP')).toBeTruthy(); // Badge
    expect(getByText('Concepcion Pequeña, Naga City')).toBeTruthy();
    expect(getByText('Emergency')).toBeTruthy();
    expect(getByText('Consultation')).toBeTruthy();
  });

  it('handles call button press', () => {
    const { getByText } = render(<FacilityDetailsScreen />);
    fireEvent.press(getByText('Call'));
    expect(mockOpenURL).toHaveBeenCalledWith('tel:09123456789');
  });

  it('handles share button press', () => {
    const { getByText } = render(<FacilityDetailsScreen />);
    // There are two share buttons (header and body). StandardHeader is mocked as string 'StandardHeader', 
    // so it won't render the header button children unless we make it a functional mock component that renders children.
    // However, the body button "Share" should be findable.
    fireEvent.press(getByText('Share'));
    expect(mockShare).toHaveBeenCalled();
  });
});
