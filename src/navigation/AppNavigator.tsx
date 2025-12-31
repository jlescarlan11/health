import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { NavigationAssistant } from '../features/navigation';
import { FacilityList } from '../features/facilities';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();

const Placeholder = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name} Feature Coming Soon</Text>
  </View>
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName = '';
            if (route.name === 'Assistant') iconName = 'robot';
            else if (route.name === 'Facilities') iconName = 'hospital-building';
            else if (route.name === 'YAKAP') iconName = 'card-account-details';
            return <Icon name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Assistant" component={NavigationAssistant} />
        <Tab.Screen name="Facilities" component={FacilityList} />
        <Tab.Screen name="YAKAP" children={() => <Placeholder name="YAKAP" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
