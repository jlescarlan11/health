import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Button, Switch, useTheme, Surface } from 'react-native-paper';
import { useAppSelector } from '../../../hooks/reduxHooks';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../common/Text';
import { useNavigation } from '@react-navigation/native';

export const DigitalIDCard: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const profile = useAppSelector((state) => state.profile);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Keep QR size stable to avoid layout shifts while still fitting narrow screens
  const cardWidth = screenWidth - 48;
  const qrSize = 140;
  const scanHintMinWidth = qrSize + 32;

  const qrValue = JSON.stringify({
    n: profile.fullName,
    d: profile.dob,
    b: profile.bloodType,
    p: profile.philHealthId,
    v: 1, // Versioning for future schema updates
  });

  const hasName = !!profile.fullName?.trim();
  const hasDob = !!profile.dob?.trim();
  const formattedDob = hasDob ? formatDobForDisplay(profile.dob) : '---';

  const healthIdRows = [
    [
      { label: 'Full Name', value: hasName ? profile.fullName : '---' },
      { label: 'Date of Birth', value: formattedDob || '---' },
    ],
    [
      { label: 'Blood Type', value: profile.bloodType || '---' },
      { label: 'PhilHealth ID', value: profile.philHealthId || '---' },
    ],
  ];
  const detailColumnStyle = cardWidth >= 420 ? styles.detailGridItemHalf : styles.detailGridItemFull;

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
      {/* Header with Branding */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="id-card"
            size={20}
            color={theme.colors.secondary}
            style={styles.headerIcon}
          />
          <Text style={styles.headerTitle}>NAGA CITY HEALTH ID</Text>
        </View>
        <Button
          mode="text"
          compact
          onPress={() => navigation.navigate('HealthProfileEdit')}
          labelStyle={styles.editButtonLabel}
          style={styles.editButton}
        >
          Edit
        </Button>
      </View>

      <View style={styles.content}>
        <View style={[styles.qrWrapper, { minWidth: scanHintMinWidth }]}> 
          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={qrSize}
              color={theme.colors.onSurface}
              backgroundColor="transparent"
              quietZone={4}
            />
          </View>
          <Text
            variant="labelSmall"
            style={styles.scanHint}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            SCAN TO VERIFY
          </Text>
        </View>

        <View style={styles.detailsGrid}>
          {healthIdRows.map((row, rowIndex) => (
            <View key={`health-row-${rowIndex}`} style={styles.detailGridRow}>
              {row.map((entry) => (
                <View key={entry.label} style={[styles.detailGridItem, detailColumnStyle]}>
                  <Text variant="labelSmall" style={styles.detailGridLabel}>
                    {entry.label}
                  </Text>
                  <Text variant="titleMedium" style={styles.detailGridValue} numberOfLines={2}>
                    {entry.value}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text variant="labelSmall" style={styles.toggleLabel}>Show Health Snapshot</Text>
          <Switch
            value={showSnapshot}
            onValueChange={setShowSnapshot}
            color={theme.colors.primary}
            style={styles.switch}
          />
        </View>

        {showSnapshot && (
          <View style={styles.medicalSection}>
            <Text
              variant="labelSmall"
              style={[styles.medicalHeader, { color: theme.colors.primary }]}
            >
              Health Snapshots
            </Text>
            <View style={styles.medicalGrid}>
              {[ 
                {
                  label: 'Chronic conditions',
                  value: formatListForDisplay(profile.chronicConditions),
                },
                {
                  label: 'Allergies',
                  value: formatListForDisplay(profile.allergies),
                },
                {
                  label: 'Current medications',
                  value: formatListForDisplay(profile.currentMedications),
                },
                {
                  label: 'Surgical history',
                  value: formatTextValue(profile.surgicalHistory),
                },
                {
                  label: 'Family history',
                  value: formatTextValue(profile.familyHistory),
                },
              ].map((entry) => {
                const columnStyle =
                  cardWidth >= 420 ? styles.medicalItemHalf : styles.medicalItemFull;
                return (
                  <View key={entry.label} style={[styles.medicalItem, columnStyle]}>
                    <Text variant="labelSmall" style={styles.medicalLabel}>
                      {entry.label.toUpperCase()}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[styles.medicalValue, { color: theme.colors.onSurface }]}
                      numberOfLines={4}
                    >
                      {entry.value}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Footer Decoration */}
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  editButton: {
    paddingHorizontal: 0,
    minHeight: 0,
  },
  editButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  qrWrapper: {
    alignItems: 'center',
  },
  detailsGrid: {
    marginTop: 16,
  },
  detailGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailGridItem: {
    paddingVertical: 6,
  },
  detailGridItemHalf: {
    flexBasis: '48%',
  },
  detailGridItemFull: {
    flexBasis: '100%',
  },
  detailGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#45474B',
    letterSpacing: 0.5,
  },
  detailGridValue: {
    marginTop: 4,
    fontWeight: '700',
    color: '#1E1E1E',
    lineHeight: 20,
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
    textAlign: 'center',
    flexWrap: 'nowrap',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  toggleLabel: {
    fontWeight: '700',
    color: '#45474B',
  },
  switch: {
    transform: [{ scale: 0.95 }],
  },
  divider: {
    height: 1,
    marginTop: 12,
  },
  medicalSection: {
    marginTop: 12,
  },
  medicalHeader: {
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  medicalGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  medicalItem: {
    marginBottom: 12,
  },
  medicalItemHalf: {
    flexBasis: '48%',
  },
  medicalItemFull: {
    flexBasis: '100%',
  },
  medicalLabel: {
    fontSize: 9,
    opacity: 0.65,
    fontWeight: '600',
  },
  medicalValue: {
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 18,
  },
  hiddenMessage: {
    marginTop: 8,
    fontWeight: '500',
    opacity: 0.7,
  },
});

function formatDobForDisplay(dob?: string | null): string {
  if (!dob) {
    return '';
  }

  const parts = dob.split('-');
  if (parts.length !== 3) {
    return dob;
  }

  const [year, month, day] = parts;
  if (!month || !day || !year) {
    return dob;
  }

  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
}

function formatListForDisplay(items?: string[] | null): string {
  if (!items || items.length === 0) {
    return 'Not recorded';
  }

  const filtered = items
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (!filtered.length) {
    return 'Not recorded';
  }

  return filtered.join(', ');
}

function formatTextValue(value?: string | null): string {
  return value && value.trim() ? value : 'Not recorded';
}
