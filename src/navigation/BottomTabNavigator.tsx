import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainHomeScreen } from '../screens/MainHomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Dynamic height calculation: Base height (60) + safe area inset
  // For devices without insets, we provide a reasonable default padding
  const paddingBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 12);
  const tabHeight = 60 + paddingBottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: 'rgba(0,0,0,0.05)',
          elevation: 8,
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeFeed"
        component={MainHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={28} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
