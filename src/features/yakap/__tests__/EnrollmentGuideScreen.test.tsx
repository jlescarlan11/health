import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EnrollmentGuideScreen from '../EnrollmentGuideScreen';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import enrollmentReducer from '../../../store/enrollmentSlice';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

// Mock dependencies
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../../../components/common/StandardHeader', () => {
    const { Text } = require('react-native');
    return {
        __esModule: true,
        default: ({ title }: any) => <Text>{title}</Text>
    }
});

// Mock Icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'Icon',
}));

describe('EnrollmentGuideScreen', () => {
  let store: any;

  const createTestStore = (initialState: any) => {
    return configureStore({
      reducer: {
        enrollment: enrollmentReducer,
      },
      preloadedState: initialState,
    });
  };

  const renderComponent = (store: any) => (
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>
          <EnrollmentGuideScreen />
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );

  it('renders correctly when pathway is selected', () => {
    store = createTestStore({
      enrollment: {
        enrollmentStatus: 'in_progress',
        selectedPathway: 'egovph',
        currentStep: 0,
        completedSteps: [],
        uploadedDocuments: {},
        data: {},
        completionDate: null
      }
    });

    const { getByText } = render(renderComponent(store));
    
    expect(getByText('eGovPH Mobile App')).toBeTruthy();
    expect(getByText('Step 1 of 5')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
  });

  it('navigates back if no pathway selected', () => {
     store = createTestStore({
      enrollment: {
        enrollmentStatus: 'idle',
        selectedPathway: null,
        currentStep: 0,
        completedSteps: [],
        uploadedDocuments: {},
        data: {},
        completionDate: null
      }
    });
    
    render(renderComponent(store));
    expect(mockGoBack).toHaveBeenCalled();
  });
});