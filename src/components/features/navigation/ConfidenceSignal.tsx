import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConfidenceSignalProps {
  missingFields?: string[];
}

export const ConfidenceSignal = ({ missingFields = [] }: ConfidenceSignalProps) => {
  const theme = useTheme();

  const getMessage = () => {
    if (missingFields.length > 0) {
      const list =
        missingFields.length === 1
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
      const verb = missingFields.length > 1 ? 'were' : 'was';
      return `Recommended higher care level because ${list} ${verb} unclear.`;
    }
    return 'Recommended higher care level because your symptoms are complex or vague.';
  };

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.elevation.level1,
          borderLeftColor: theme.colors.primary,
        },
      ]}
      elevation={0}
      accessibilityRole="alert"
      accessibilityLabel={`Safety Note: ${getMessage()}`}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={24}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text variant="labelLarge" style={[styles.title, { color: theme.colors.primary }]}>
          Safety Note
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {getMessage()}
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    lineHeight: 18,
  },
});
