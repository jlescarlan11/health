import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

import { MainHomeScreen } from '../screens/MainHomeScreen';
import CheckNavigator from './CheckNavigator';
import FacilitiesNavigator from './FacilitiesNavigator';
import YakapNavigator from './YakapNavigator';
import { TabParamList } from './types';
import { TabBarIcon } from '../components/common/TabBarIcon';

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'alert';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Check') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'Find') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'YAKAP') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          }

          return <TabBarIcon name={iconName} size={size} color={color} focused={focused} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          height: 24 + insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={MainHomeScreen}
        options={{ headerShown: false, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Check"
        component={CheckNavigator}
        options={{ headerShown: false, tabBarLabel: 'Check' }}
      />
      <Tab.Screen
        name="Find"
        component={FacilitiesNavigator}
        options={{ headerShown: false, tabBarLabel: 'Find' }}
      />
      <Tab.Screen
        name="YAKAP"
        component={YakapNavigator}
        options={{ headerShown: false, tabBarLabel: 'YAKAP' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
