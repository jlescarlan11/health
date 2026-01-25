import React from 'react';
import { render } from '@testing-library/react-native';
import { FacilityCard } from '../FacilityCard';
import { useTheme } from 'react-native-paper';

// Mock theme
jest.mock('react-native-paper', () => {
  const original = jest.requireActual('react-native-paper');
  return {
    ...original,
    useTheme: jest.fn(() => ({
      colors: {
        surface: '#ffffff',
        primary: '#379777',
        primaryContainer: '#379777',
        onPrimaryContainer: '#ffffff',
        outline: '#cccccc',
        outlineVariant: '#eeeeee',
        secondaryContainer: '#f4ce14',
      },
    })),
  };
});

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('FacilityCard', () => {
  const mockFacility = {
    id: '1',
    name: 'Test Clinic',
    type: 'Health Center',
    services: ['General Medicine'],
    address: '123 Test St',
    latitude: 13.62,
    longitude: 123.19,
    phone: '1234567890',
    yakapAccredited: true,
    is_24_7: true,
    busyness: { status: 'quiet' as const, score: 0.2 },
  };

  it('renders busyness indicator when facility is open', () => {
    const { getByText } = render(<FacilityCard facility={mockFacility} />);
    expect(getByText('Quiet Now')).toBeTruthy();
  });

  it('hides busyness indicator when facility is closed', () => {
    const closedFacility = {
      ...mockFacility,
      is_24_7: false,
      operatingHours: { is24x7: false, schedule: { [new Date().getDay()]: null } },
    };
    const { queryByText } = render(<FacilityCard facility={closedFacility} />);
    expect(queryByText('Quiet Now')).toBeNull();
  });
});
