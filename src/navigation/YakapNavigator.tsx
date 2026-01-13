import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  YakapHomeScreen, 
  YakapFaqScreen,
  EligibilityCheckerScreen, 
  EnrollmentPathwayScreen,
  EnrollmentGuideScreen,
  EnrollmentCompletionScreen
} from '../features/yakap';
import { YakapStackParamList } from './types';
import StandardHeader from '../components/common/StandardHeader';

const Stack = createStackNavigator<YakapStackParamList>();

const YakapNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="YakapHome">
      <Stack.Screen
        name="YakapHome"
        component={YakapHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="YakapFaq"
        component={YakapFaqScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EligibilityChecker"
        component={EligibilityCheckerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EnrollmentPathway"
        component={EnrollmentPathwayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EnrollmentGuide"
        component={EnrollmentGuideScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EnrollmentCompletion"
        component={EnrollmentCompletionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default YakapNavigator;