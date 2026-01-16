import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { YakapHomeScreen } from '../features/yakap';
import { YakapStackParamList } from './types';

const Stack = createStackNavigator<YakapStackParamList>();

const YakapNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="YakapHome"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F7F8' },
        cardShadowEnabled: false,
      }}
    >
      <Stack.Screen name="YakapHome" component={YakapHomeScreen} />
    </Stack.Navigator>
  );
};

export default YakapNavigator;
