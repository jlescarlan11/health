import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';

import { RootStackParamList } from '../types/navigation';
import { CustomHeader } from '../components/common/CustomHeader';

// Screens
import { MainHomeScreen } from '../screens/MainHomeScreen';
import { NavigationAssistant } from '../features/navigation';
import { SymptomAssessmentScreen } from '../screens/SymptomAssessmentScreen';
import { RecommendationScreen } from '../screens/RecommendationScreen';
import { FacilityList } from '../features/facilities';
import { FacilityDetailsScreen } from '../screens/FacilityDetailsScreen';
import { YakapEnrollmentScreen } from '../features/yakap';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      MainHome: 'home',
      AiChat: 'chat',
      SymptomAssessment: 'assessment',
      Recommendations: 'recommendations',
      FacilityDirectory: 'facilities',
      FacilityDetails: 'facilities/:facilityId',
      YakapEnrollment: 'yakap',
      Profile: 'profile',
      Settings: 'settings',
    },
  },
};

const AppNavigator = () => {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="MainHome"
        screenOptions={{
          header: (props) => <CustomHeader {...props} />,
        }}
      >
        <Stack.Screen name="MainHome" component={MainHomeScreen} />
        <Stack.Screen name="AiChat" component={NavigationAssistant} />
        <Stack.Screen name="SymptomAssessment" component={SymptomAssessmentScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationScreen} />
        <Stack.Screen name="FacilityDirectory" component={FacilityList} />
        <Stack.Screen name="FacilityDetails" component={FacilityDetailsScreen} />
        <Stack.Screen name="YakapEnrollment" component={YakapEnrollmentScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;