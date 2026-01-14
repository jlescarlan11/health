import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import { RootStackParamList } from '../types/navigation';
import NotFoundScreen from '../screens/NotFoundScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import SymptomAssessmentScreen from '../screens/SymptomAssessmentScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
import CrisisSupportScreen from '../screens/CrisisSupportScreen';
import FacilityDetailsScreen from '../screens/FacilityDetailsScreen';
import {
  YakapFaqScreen,
  EligibilityCheckerScreen,
  EnrollmentPathwayScreen,
  EnrollmentGuideScreen,
  EnrollmentCompletionScreen,
} from '../features/yakap';
import StandardHeader from '../components/common/StandardHeader';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />

      {/* AI Navigator Flow */}
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
          header: () => <StandardHeader title="Recommendation" />,
        }}
      />
      <Stack.Screen
        name="CrisisSupport"
        component={CrisisSupportScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      {/* Facilities Flow */}
      <Stack.Screen
        name="FacilityDetails"
        component={FacilityDetailsScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* YAKAP Flow */}
      <Stack.Screen name="YakapFaq" component={YakapFaqScreen} options={{ headerShown: false }} />
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

      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ title: 'Terms of Service' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
