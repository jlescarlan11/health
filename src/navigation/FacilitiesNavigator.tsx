import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FacilityDirectoryScreen } from '../features/facilities/FacilityDirectoryScreen';
import { FacilitiesStackParamList } from './types';

const Stack = createStackNavigator<FacilitiesStackParamList>();

const FacilitiesNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FacilityDirectory"
        component={FacilityDirectoryScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default FacilitiesNavigator;
