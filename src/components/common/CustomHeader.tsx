import React from 'react';
import { Appbar, useTheme } from 'react-native-paper';
import { StackHeaderProps } from '@react-navigation/stack';

export const CustomHeader = ({ navigation, back }: StackHeaderProps) => {
  const theme = useTheme();

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
      {back ? <Appbar.BackAction onPress={navigation.goBack} /> : null}

      <Appbar.Content
        title="HEALTH"
        titleStyle={{
          color: theme.colors.primary,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}
      />
    </Appbar.Header>
  );
};
