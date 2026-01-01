import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
  size?: number;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  focused,
  color,
  size = 24,
}) => {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={{ marginBottom: -3 }}
    />
  );
};
