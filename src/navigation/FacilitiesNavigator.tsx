import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FacilityDirectoryScreen } from '../features/facilities/FacilityDirectoryScreen';
import { FacilitiesStackParamList } from './types';

const Stack = createStackNavigator<FacilitiesStackParamList>();

const FacilitiesNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F7F8' },
        cardShadowEnabled: false,
      }}
    >
      <Stack.Screen name="FacilityDirectory" component={FacilityDirectoryScreen} />
    </Stack.Navigator>
  );
};

export default FacilitiesNavigator;
