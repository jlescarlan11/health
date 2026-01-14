import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { YAKAP_BENEFITS } from '../../../features/yakap/yakapContent';

interface YakapBenefitsCardProps {
  style?: StyleProp<ViewStyle>;
}

export const YakapBenefitsCard: React.FC<YakapBenefitsCardProps> = ({ style }) => {
  const theme = useTheme();

  // We use the first benefit as core, and the next 3 as included coverage
  const coreBenefit = YAKAP_BENEFITS[0];
  const supplementaryBenefits = YAKAP_BENEFITS.slice(1, 4);

  return (
    <View
      style={[
        styles.benefitsWrapper,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 20,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        },
        style,
      ]}
    >
      <View style={styles.benefitHeader}>
        <Text variant="labelLarge" style={[styles.benefitLabel, { color: theme.colors.primary }]}>
          CORE BENEFIT
        </Text>
        <Text
          variant="headlineSmall"
          style={[styles.mainBenefit, { color: theme.colors.onSurface }]}
        >
          {coreBenefit.category}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
            lineHeight: 22,
            opacity: 0.9,
          }}
        >
          {coreBenefit.description}
        </Text>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.colors.outlineVariant, opacity: 0.2 }]}
      />

      <View style={styles.supplementarySection}>
        <Text
          variant="labelMedium"
          style={{
            color: theme.colors.onSurface,
            marginBottom: 20,
            opacity: 0.6,
            letterSpacing: 1.5,
            fontWeight: '800',
          }}
        >
          INCLUDED COVERAGE
        </Text>

        <View style={styles.benefitList}>
          {supplementaryBenefits.map((benefit) => {
            // Special formatting for medicine allowance to match the design pattern
            const isMedicines = benefit.id === 'medicines';
            const isLab = benefit.id === 'lab_tests';
            const isScreenings = benefit.id === 'screenings';

            return (
              <View key={benefit.id} style={styles.benefitItem}>
                <View style={[styles.benefitDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isLab && (
                    <Text>
                      <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Free</Text>{' '}
                      Lab Tests & Diagnostics
                    </Text>
                  )}
                  {isMedicines && (
                    <Text>
                      <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                        ₱20,000
                      </Text>{' '}
                      Annual Medicine Allowance
                    </Text>
                  )}
                  {isScreenings && (
                    <Text>
                      <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                        Early Detection
                      </Text>{' '}
                      Cancer Screenings
                    </Text>
                  )}
                  {!isLab && !isMedicines && !isScreenings && benefit.category}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  benefitsWrapper: {
    padding: 24,
  },
  benefitHeader: {
    marginBottom: 16,
  },
  benefitLabel: {
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  mainBenefit: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  supplementarySection: {
    width: '100%',
  },
  benefitList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
});
