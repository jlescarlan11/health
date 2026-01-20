import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ConfidenceSignal = () => {
  const theme = useTheme();

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
      accessibilityLabel="Safety Note: We’ve recommended a slightly higher level of care because your symptoms are complex or vague. Better safe than sorry."
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
          We’ve recommended a slightly higher level of care because your symptoms are complex or
          vague. Better safe than sorry.
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
