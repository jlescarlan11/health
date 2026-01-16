import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { YakapHomeScreen } from '../features/yakap';
import { YakapStackParamList } from './types';

const Stack = createStackNavigator<YakapStackParamList>();

const YakapNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="YakapHome">
      <Stack.Screen name="YakapHome" component={YakapHomeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default YakapNavigator;
