import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import CheckNavigator from './CheckNavigator';
import FacilitiesNavigator from './FacilitiesNavigator';
import YakapNavigator from './YakapNavigator';
import { RootStackParamList } from '../types/navigation';
import NotFoundScreen from '../screens/NotFoundScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import SymptomAssessmentScreen from '../screens/SymptomAssessmentScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
import { ClinicalNoteScreen } from '../screens/ClinicalNoteScreen';
import { ClinicalHistoryScreen } from '../screens/ClinicalHistoryScreen';
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
import MedicationTrackerScreen from '../screens/MedicationTrackerScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F7F8' }, // Matches app background exactly
        cardShadowEnabled: false, // Prevents the vertical line shadow artifact
      }}
    >
      <Stack.Screen name="Home" component={BottomTabNavigator} />
      <Stack.Screen name="Check" component={CheckNavigator} />
      <Stack.Screen name="Find" component={FacilitiesNavigator} />
      <Stack.Screen name="YAKAP" component={YakapNavigator} />

      {/* Check Symptom Flow */}
      <Stack.Screen name="SymptomAssessment" component={SymptomAssessmentScreen} />
      <Stack.Screen
        name="Recommendation"
        component={RecommendationScreen}
        options={{
          headerShown: true,
          header: () => <StandardHeader title="Recommendation" />,
        }}
      />
      <Stack.Screen name="ClinicalNote" component={ClinicalNoteScreen} />
      <Stack.Screen name="ClinicalHistory" component={ClinicalHistoryScreen} />
      <Stack.Screen
        name="CrisisSupport"
        component={CrisisSupportScreen}
        options={{
          presentation: 'modal',
        }}
      />

      {/* Facilities Flow */}
      <Stack.Screen name="FacilityDetails" component={FacilityDetailsScreen} />

      {/* YAKAP Flow */}
      <Stack.Screen name="YakapFaq" component={YakapFaqScreen} />
      <Stack.Screen name="EligibilityChecker" component={EligibilityCheckerScreen} />
      <Stack.Screen name="EnrollmentPathway" component={EnrollmentPathwayScreen} />
      <Stack.Screen name="EnrollmentGuide" component={EnrollmentGuideScreen} />
      <Stack.Screen name="EnrollmentCompletion" component={EnrollmentCompletionScreen} />

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
      <Stack.Screen
        name="MedicationTracker"
        component={MedicationTrackerScreen}
        options={{
          headerShown: true,
          header: () => <StandardHeader title="Medication Tracker" />,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
