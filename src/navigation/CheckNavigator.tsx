import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NavigatorHomeScreen from '../features/navigation/NavigatorHomeScreen';
import SymptomAssessmentScreen from '../screens/SymptomAssessmentScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
import { CheckStackParamList } from './types';
import StandardHeader from '../components/common/StandardHeader';

const Stack = createStackNavigator<CheckStackParamList>();

const CheckNavigator = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CheckNavigator.tsx:10', message: 'CheckNavigator render', data: { registeredScreens: ['NavigatorHome', 'SymptomAssessment', 'Recommendation'], recommendationScreenName: 'Recommendation', timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H1' } }) }).catch(() => {});
  // #endregion
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
          header: () => <StandardHeader title="Symptom Check" showBackButton />,
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
