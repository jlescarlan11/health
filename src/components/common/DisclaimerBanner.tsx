import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    <Surface 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.elevation.level2,
        }
      ]} 
      elevation={2}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name="shield-alert-outline" 
            size={24} 
            color={theme.colors.primary} 
            style={styles.icon}
          />
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Medical Disclaimer
          </Text>
        </View>
        
        <Text variant="bodyMedium" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
          This app provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.
        </Text>
        
        <View style={styles.actionRow}>
           <Text variant="labelSmall" style={{ color: theme.colors.error, flex: 1, marginRight: 8 }}>
             In case of emergency, contact local emergency services immediately.
           </Text>
           <Button
            mode="contained-tonal"
            onPress={onAccept}
            style={styles.button}
            labelStyle={{ fontSize: 12 }}
            compact
          >
            I Understand
          </Button>
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 8,
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  text: {
    marginBottom: 12,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  button: {
    minWidth: 100,
  },
});