import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NavigatorHomeScreen from '../features/navigation/NavigatorHomeScreen';
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
          header: () => <StandardHeader title="AI Navigator" showBackButton />,
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckNavigator;
