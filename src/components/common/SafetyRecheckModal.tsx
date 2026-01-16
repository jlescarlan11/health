import React from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Button } from './Button';
import { SlideToCall } from './SlideToCall';

interface SafetyRecheckModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCallInitiated?: (number: string) => void;
}

export const SafetyRecheckModal: React.FC<SafetyRecheckModalProps> = ({
  visible,
  onDismiss,
  onCallInitiated,
}) => {
  const theme = useTheme();

  const handleCall = (number: string) => {
    const cleanNumber = number.replace(/[^\d+]/g, '');
    const url = Platform.OS === 'android' ? `tel:${cleanNumber}` : `telprompt:${cleanNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
          onCallInitiated?.(number);
        }
      })
      .catch((err) => console.error('Error opening dialer:', err));
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.errorContainer }]}>
          <MaterialCommunityIcons name="alert-decagram" size={32} color={theme.colors.error} />
        </View>
        <Text style={[styles.title, { color: theme.colors.error }]}>Safety Check</Text>
      </View>

      <Text style={styles.description}>
        If you or someone else is in immediate danger or experiencing a life-threatening emergency,
        please contact emergency services right away.
      </Text>

      <View style={styles.emergencySection}>
        <SlideToCall
          onSwipeComplete={() => handleCall('911')}
          label="Slide to call 911"
          containerStyle={styles.slideToCall}
        />

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
            OR CONTACT LOCAL SERVICES
          </Text>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>

        <Surface
          style={[styles.contactCard, { backgroundColor: theme.colors.surfaceVariant }]}
          elevation={0}
        >
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>NCGH Emergency</Text>
            <Text style={styles.contactPhone}>(054) 473-3111</Text>
          </View>
          <IconButton
            icon="phone"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            onPress={() => handleCall('(054) 473-3111')}
          />
        </Surface>

        <Surface
          style={[styles.contactCard, { backgroundColor: theme.colors.surfaceVariant }]}
          elevation={0}
        >
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>Mental Health Crisis</Text>
            <Text style={styles.contactPhone}>1553</Text>
          </View>
          <IconButton
            icon="phone"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            onPress={() => handleCall('1553')}
          />
        </Surface>
      </View>

      <Button
        title="I AM SAFE, CONTINUE"
        onPress={onDismiss}
        variant="outline"
        style={styles.closeButton}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 24,
    borderRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  emergencySection: {
    marginBottom: 24,
  },
  slideToCall: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactPhone: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 8,
  },
});
