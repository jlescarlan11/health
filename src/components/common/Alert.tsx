import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';

export type AlertType = 'info' | 'warning' | 'error';

interface AlertProps {
  type: AlertType;
  message: string;
  onDismiss?: () => void;
  style?: ViewStyle;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  onDismiss,
  style,
}) => {
  const theme = useTheme();

  let backgroundColor;
  let icon = 'information';
  let color;

  switch (type) {
    case 'info':
      backgroundColor = theme.colors.surfaceVariant;
      color = theme.colors.onSurfaceVariant;
      icon = 'information';
      break;
    case 'warning':
      backgroundColor = '#FFF3E0'; // Orange-ish
      color = '#E65100';
      icon = 'alert';
      break;
    case 'error':
      backgroundColor = theme.colors.errorContainer;
      color = theme.colors.onErrorContainer;
      icon = 'alert-circle';
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <IconButton icon={icon} iconColor={color} size={24} />
      <Text style={[styles.message, { color }]}>{message}</Text>
      {onDismiss && (
        <IconButton icon="close" iconColor={color} size={20} onPress={onDismiss} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  message: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
});
