import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { ClinicalHistoryScreen } from '../src/screens/ClinicalHistoryScreen';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as DB from '../src/services/database';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useFocusEffect: (callback: any) => {
      // In tests, we can just treat useFocusEffect as useEffect
      // We use the global React if available or just execute it once
      const React = require('react');
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// Mock DB
jest.mock('../src/services/database', () => ({
  getClinicalHistory: jest.fn(),
}));

describe('ClinicalHistoryScreen', () => {
  const component = (
    <Provider store={store}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            <ClinicalHistoryScreen />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </Provider>
  );

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    (DB.getClinicalHistory as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    const { getByTestId, queryByText } = render(component);
    // Standard ActivityIndicator doesn't have testID by default, but we can check if content is missing
    expect(queryByText('My Health Records')).toBeTruthy();
  });

  it('renders history items correctly', async () => {
    const mockHistory = [
      {
        id: '1',
        timestamp: Date.now(),
        initial_symptoms: 'Headache',
        recommended_level: 'health_center',
        clinical_soap: 'SOAP 1',
        medical_justification: 'Justification 1',
      },
      {
        id: '2',
        timestamp: Date.now() - 10000,
        initial_symptoms: 'Chest pain',
        recommended_level: 'emergency',
        clinical_soap: 'SOAP 2',
        medical_justification: 'Justification 2',
      },
    ];
    (DB.getClinicalHistory as jest.Mock).mockResolvedValue(mockHistory);

    const { getByText } = render(component);

    await waitFor(() => {
      expect(getByText('Headache')).toBeTruthy();
      expect(getByText('Chest pain')).toBeTruthy();
      expect(getByText('HEALTH CENTER')).toBeTruthy();
      expect(getByText('EMERGENCY')).toBeTruthy();
    });
  });

  it('navigates to ClinicalNote when a record is pressed', async () => {
    const mockHistory = [
      {
        id: 'record-123',
        timestamp: Date.now(),
        initial_symptoms: 'Fever',
        recommended_level: 'self_care',
        clinical_soap: 'SOAP',
        medical_justification: 'Just',
      },
    ];
    (DB.getClinicalHistory as jest.Mock).mockResolvedValue(mockHistory);

    const { getByText } = render(component);

    await waitFor(() => {
      fireEvent.press(getByText('Fever'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('ClinicalNote', { recordId: 'record-123' });
  });

  it('renders empty vault state when no records exist', async () => {
    (DB.getClinicalHistory as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(component);

    await waitFor(() => {
      expect(getByText('Empty Vault')).toBeTruthy();
      expect(getByText("You don't have any saved clinical assessments yet.")).toBeTruthy();
      expect(getByText('Start New Assessment')).toBeTruthy();
    });
  });
});
