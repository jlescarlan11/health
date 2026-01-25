import React from 'react';
import { render } from '@testing-library/react-native';
import { StandardHeader } from '../src/components/common/StandardHeader';
import { FacilityCard } from '../src/components/common/FacilityCard';
import { useAdaptiveUI } from '../src/hooks/useAdaptiveUI';
import { Text, StyleSheet } from 'react-native';

// Mock the hook
jest.mock('../src/hooks/useAdaptiveUI');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(),
  }),
}));

// Mock SafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Theme
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    useTheme: () => ({
      colors: {
        surface: '#ffffff',
        onSurface: '#000000',
        outlineVariant: '#cccccc',
        primary: '#379777',
      },
    }),
  };
});

describe('Adaptive UI Typography', () => {
  const mockUseAdaptiveUI = useAdaptiveUI as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StandardHeader', () => {
    it('applies default font size when scaleFactor is 1.0', () => {
      mockUseAdaptiveUI.mockReturnValue({ scaleFactor: 1.0, isSimplified: false });

      const { getByText } = render(<StandardHeader title="Test Header" />);
      const title = getByText('Test Header');
      const flattenedStyle = StyleSheet.flatten(title.props.style);

      expect(flattenedStyle).toEqual(
        expect.objectContaining({ fontSize: 18 })
      );
    });

    it('applies scaled font size when scaleFactor is 1.25', () => {
      mockUseAdaptiveUI.mockReturnValue({ scaleFactor: 1.25, isSimplified: true });

      const { getByText } = render(<StandardHeader title="Test Header" />);
      const title = getByText('Test Header');
      const flattenedStyle = StyleSheet.flatten(title.props.style);

      expect(flattenedStyle).toEqual(
        expect.objectContaining({ fontSize: 18 * 1.25 })
      );
    });
  });

  describe('FacilityCard', () => {
    const mockFacility = {
      id: '1',
      name: 'Test Facility',
      type: 'Hospital',
      address: '123 St',
      latitude: 0,
      longitude: 0,
      services: ['General'],
      contacts: [],
      busyness: 'low',
      yakapAccredited: true,
    };

    it('applies default font size to title when scaleFactor is 1.0', () => {
      mockUseAdaptiveUI.mockReturnValue({ scaleFactor: 1.0, isSimplified: false });

      const { getByText } = render(<FacilityCard facility={mockFacility as any} />);
      const title = getByText('Test Facility');
      const flattenedStyle = StyleSheet.flatten(title.props.style);

      expect(flattenedStyle).toEqual(
        expect.objectContaining({ fontSize: 20, lineHeight: 26 })
      );
    });

    it('applies scaled font size to title when scaleFactor is 1.25', () => {
      mockUseAdaptiveUI.mockReturnValue({ scaleFactor: 1.25, isSimplified: true });

      const { getByText } = render(<FacilityCard facility={mockFacility as any} />);
      const title = getByText('Test Facility');
      const flattenedStyle = StyleSheet.flatten(title.props.style);

      expect(flattenedStyle).toEqual(
        expect.objectContaining({ fontSize: 20 * 1.25, lineHeight: 26 * 1.25 })
      );
    });
  });
});
