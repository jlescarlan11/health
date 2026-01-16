import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button } from './Button';

interface EmergencyButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  buttonColor?: string;
  textColor?: string;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onPress,
  style,
  buttonColor,
  textColor,
}) => {
  return (
    <Button
      variant="danger"
      onPress={onPress}
      icon="phone-in-talk"
      buttonColor={buttonColor}
      textColor={textColor}
      style={[styles.button, style]}
      contentStyle={styles.content}
      labelStyle={styles.label}
      accessibilityLabel="Emergency Call"
      accessibilityHint="Double tap to initiate an emergency call immediately"
      title="EMERGENCY CALL"
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    elevation: 4,
    marginVertical: 16,
  },
  content: {
    height: 56,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
