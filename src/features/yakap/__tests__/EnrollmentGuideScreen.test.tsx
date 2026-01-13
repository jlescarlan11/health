import React from 'react';
import { render } from '@testing-library/react-native';
import EnrollmentGuideScreen from '../EnrollmentGuideScreen';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

// Mock dependencies
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockParams = { pathwayId: 'egovph' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockParams
  }),
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

  const renderComponent = () => (
      <PaperProvider>
        <NavigationContainer>
          <EnrollmentGuideScreen />
        </NavigationContainer>
      </PaperProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when pathway is selected', () => {
    mockParams = { pathwayId: 'egovph' };
    const { getByText } = render(renderComponent());
    
    expect(getByText('eGovPH Mobile App')).toBeTruthy();
    expect(getByText('Step 1 of 5')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
  });

  it('navigates back if no pathway selected (invalid id)', () => {
    // @ts-ignore
    mockParams = { pathwayId: null };
    
    render(renderComponent());
    // The component checks if pathway exists. If ID is null, find returns undefined.
    expect(mockGoBack).toHaveBeenCalled();
  });
});
