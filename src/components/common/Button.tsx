import React from 'react';
import { StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'text';

interface ButtonProps extends Omit<React.ComponentProps<typeof PaperButton>, 'children' | 'mode'> {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'image' | 'text' | 'none';
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
  contentStyle,
  mode: modeProp,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
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
    case 'text':
      mode = 'text';
      textColor = theme.colors.primary;
      break;
  }

  const finalMode = modeProp || mode;

  return (
    <PaperButton
      mode={finalMode}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={icon}
      buttonColor={buttonColor}
      textColor={textColor}
      style={[styles.button, style]}
      labelStyle={[styles.label, labelStyle]}
      contentStyle={contentStyle}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
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
    minHeight: 48,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
});
