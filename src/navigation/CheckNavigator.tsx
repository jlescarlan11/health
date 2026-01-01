import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NavigatorHomeScreen from '../features/navigation/NavigatorHomeScreen';
import SymptomAssessmentScreen from '../screens/SymptomAssessmentScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
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
          header: () => <StandardHeader title="Assessment" showBackButton />,
        }}
      />
      <Stack.Screen
        name="Recommendation"
        component={RecommendationScreen}
        options={{
          header: () => <StandardHeader title="Recommendation" showBackButton />,
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckNavigator;
