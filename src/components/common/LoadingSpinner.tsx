import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useTheme, Text, ActivityIndicator } from 'react-native-paper';

interface LoadingSpinnerProps {
  variant?: 'fullscreen' | 'inline';
  visible?: boolean;
  text?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'inline',
  visible = true,
  text,
  size = 'large',
  color,
}) => {
  const theme = useTheme();
  const spinnerColor = color || theme.colors.primary;

  if (!visible) return null;

  if (variant === 'fullscreen') {
    return (
      <Modal transparent animationType="fade" visible={visible}>
        <View style={styles.modalBackground}>
          <View
            style={[styles.activityIndicatorWrapper, { backgroundColor: theme.colors.surface }]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={text || 'Loading'}
          >
            <ActivityIndicator animating={true} color={spinnerColor} size={size} />
            {!!text && <Text style={[styles.text, { color: theme.colors.onSurface }]}>{text}</Text>}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View
      style={styles.inlineContainer}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={text || 'Loading'}
    >
      <ActivityIndicator animating={true} color={spinnerColor} size={size} />
      {!!text && <Text style={[styles.inlineText, { color: theme.colors.onSurface }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  activityIndicatorWrapper: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  inlineText: {
    marginLeft: 12,
    fontSize: 14,
  },
});
