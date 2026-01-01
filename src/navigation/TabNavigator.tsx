import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MainHomeScreen } from '../screens/MainHomeScreen';
import { ProfileScreen } from '../features';
import CheckNavigator from './CheckNavigator';
import FacilitiesNavigator from './FacilitiesNavigator';
import YakapNavigator from './YakapNavigator';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Check') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'Find') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'YAKAP') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Me') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E9B95',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 60 : 56,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen name="Home" component={MainHomeScreen} options={{ headerShown: false, tabBarLabel: 'Home' }} />
      <Tab.Screen name="Check" component={CheckNavigator} options={{ headerShown: false, tabBarLabel: 'Check' }} />
      <Tab.Screen name="Find" component={FacilitiesNavigator} options={{ headerShown: false, tabBarLabel: 'Find' }} />
      <Tab.Screen name="YAKAP" component={YakapNavigator} options={{ headerShown: false, tabBarLabel: 'YAKAP' }} />
      <Tab.Screen name="Me" component={ProfileScreen} options={{ headerShown: false, tabBarLabel: 'Me' }} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
