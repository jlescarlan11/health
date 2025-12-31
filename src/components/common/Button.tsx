import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  labelStyle,
  ...props
}) => {
  const theme = useTheme();

  let mode: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal' = 'contained';
  let buttonColor: string | undefined = undefined;
  let textColor: string | undefined = undefined;

  switch (variant) {
    case 'primary':
      mode = 'contained';
      buttonColor = theme.colors.primary;
      break;
    case 'secondary':
      mode = 'contained-tonal';
      buttonColor = theme.colors.secondaryContainer;
      textColor = theme.colors.onSecondaryContainer;
      break;
    case 'danger':
      mode = 'contained';
      buttonColor = theme.colors.error;
      textColor = theme.colors.onError;
      break;
    case 'outline':
      mode = 'outlined';
      textColor = theme.colors.primary;
      break;
  }

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={icon}
      buttonColor={buttonColor}
      textColor={textColor}
      style={[styles.button, style]}
      labelStyle={[styles.label, labelStyle]}
      {...props}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 4,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 2,
  },
});
