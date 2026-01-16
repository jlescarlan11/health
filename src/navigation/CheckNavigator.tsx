import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NavigatorHomeScreen from '../features/navigation/NavigatorHomeScreen';
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
        name="NavigatorHome"
        component={NavigatorHomeScreen}
        options={{
          headerShown: true,
          header: () => <StandardHeader title="AI Navigator" showBackButton />,
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckNavigator;
