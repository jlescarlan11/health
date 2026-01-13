import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NavigatorHomeScreen from '../features/navigation/NavigatorHomeScreen';
import SymptomAssessmentScreen from '../screens/SymptomAssessmentScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
import CrisisSupportScreen from '../screens/CrisisSupportScreen';
import { CheckStackParamList } from './types';
import StandardHeader from '../components/common/StandardHeader';

const Stack = createStackNavigator<CheckStackParamList>();

const CheckNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NavigatorHome"
        component={NavigatorHomeScreen}
        options={{
          header: () => <StandardHeader title="AI Navigator" />,
        }}
      />
      <Stack.Screen
        name="SymptomAssessment"
        component={SymptomAssessmentScreen}
        options={{
          header: () => <StandardHeader title="Assessment" showBackButton backRoute="NavigatorHome" />,
        }}
      />
      <Stack.Screen
        name="Recommendation"
        component={RecommendationScreen}
        options={{
          header: () => <StandardHeader title="Recommendation" />,
        }}
      />
      <Stack.Screen
        name="CrisisSupport"
        component={CrisisSupportScreen}
        options={{
          headerShown: false, // Hide header for full immersion
          presentation: 'modal', // Make it slide up like a modal
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckNavigator;
