import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CheckSymptomScreen from '../features/navigation/CheckSymptomScreen';
import { CheckStackParamList } from './types';
import StandardHeader from '../components/common/StandardHeader';

const Stack = createStackNavigator<CheckStackParamList>();

const CheckNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F7F8' },
        cardShadowEnabled: false,
      }}
    >
      <Stack.Screen
        name="CheckSymptom"
        component={CheckSymptomScreen}
        options={{
          headerShown: true,
          header: () => <StandardHeader title="Check Symptom" showBackButton />,
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckNavigator;
