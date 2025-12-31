import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Appbar, Avatar, useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { StackHeaderProps } from '@react-navigation/stack';
import { RootState } from '../../store/store';

export const CustomHeader = ({ navigation, back }: StackHeaderProps) => {
  const theme = useTheme();
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const getInitials = (name?: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
      {back ? (
        <Appbar.BackAction onPress={navigation.goBack} />
      ) : null}
      
      <Appbar.Content 
        title="HEALTH" 
        titleStyle={{ 
          color: theme.colors.primary, 
          fontWeight: 'bold', 
          letterSpacing: 1 
        }} 
      />
      <View style={{ marginRight: 16 }}>
        <TouchableOpacity onPress={handleProfilePress} accessibilityRole="button" accessibilityLabel="Profile">
          {isLoggedIn && user?.displayName ? (
            <Avatar.Text 
              size={40} 
              label={getInitials(user.displayName)} 
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.onPrimaryContainer}
            />
          ) : (
            <Avatar.Icon 
              size={40} 
              icon="account" 
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              color={theme.colors.onSurfaceVariant}
            />
          )}
        </TouchableOpacity>
      </View>
    </Appbar.Header>
  );
};