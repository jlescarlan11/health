import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { useAppSelector } from '../../../hooks/reduxHooks';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { YakapLogo } from '../../common/YakapLogo';

export const DigitalIDCard: React.FC = () => {
  const theme = useTheme();
  const profile = useAppSelector((state) => state.profile);
  const { width: screenWidth } = useWindowDimensions();

  // Calculate card width - compact but readable
  const cardWidth = screenWidth - 48;
  const qrSize = Math.min(cardWidth * 0.4, 140);

  const qrValue = JSON.stringify({
    n: profile.fullName,
    d: profile.dob,
    b: profile.bloodType,
    p: profile.philHealthId,
    v: 1, // Versioning for future schema updates
  });

  const hasName = !!profile.fullName?.trim();
  const hasDob = !!profile.dob?.trim();

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
      {/* Header with Branding */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.branding}>
          <YakapLogo width={20} height={20} />
          <Text style={styles.headerTitle}>NAGA CITY HEALTH ID</Text>
        </View>
        <MaterialCommunityIcons name="chip" size={24} color={theme.colors.secondary} />
      </View>

      <View style={styles.content}>
        {/* Left Side: Info */}
        <View style={styles.infoContainer}>
          <View style={styles.field}>
            <Text variant="labelSmall" style={styles.label}>FULL NAME</Text>
            <Text variant="titleMedium" style={styles.value} numberOfLines={2}>
              {hasName ? profile.fullName : '---'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text variant="labelSmall" style={styles.label}>DATE OF BIRTH</Text>
            <Text variant="titleMedium" style={styles.value}>
              {hasDob ? profile.dob : '---'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text variant="labelSmall" style={styles.label}>BLOOD TYPE / PHILHEALTH</Text>
            <Text variant="titleMedium" style={styles.value}>
              {profile.bloodType || '---'} / {profile.philHealthId || '---'}
            </Text>
          </View>
        </View>

        {/* Right Side: QR Code */}
        <View style={styles.qrWrapper}>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={qrSize}
              color={theme.colors.onSurface}
              backgroundColor="transparent"
              quietZone={4}
            />
          </View>
          <Text variant="labelSmall" style={styles.scanHint}>SCAN TO VERIFY</Text>
        </View>
      </View>

      {/* Footer Decoration */}
      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.footerText}>
          OFFICIAL NAGA HEALTH RECORD
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    paddingRight: 12,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    opacity: 0.6,
    fontWeight: '700',
    fontSize: 9,
  },
  value: {
    fontWeight: '700',
    color: '#45474B',
  },
  qrWrapper: {
    alignItems: 'center',
  },
  qrContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E2E3',
  },
  scanHint: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderTopWidth: 1,
  },
  footerText: {
    marginLeft: 6,
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.6,
  },
});
