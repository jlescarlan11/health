import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, useTheme, Surface } from 'react-native-paper';

interface DisclaimerBannerProps {
  onAccept: () => void;
  visible?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  onAccept,
  visible = true,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]} elevation={2}>
      <View style={styles.content}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Medical Disclaimer
        </Text>
        <Text variant="bodySmall" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
          This app provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. In case of emergency, contact local emergency services immediately.
        </Text>
      </View>
      <Button
        mode="text"
        onPress={onAccept}
        textColor={theme.colors.primary}
        compact
      >
        I Understand
      </Button>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  content: {
    marginBottom: 8,
  },
  text: {
    marginTop: 4,
  },
});
