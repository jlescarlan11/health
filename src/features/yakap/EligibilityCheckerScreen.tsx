import React from 'react';
import { View, ScrollView, StyleSheet, Linking, Platform, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { RootStackScreenProps } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setHasPhilHealth } from '../../store/settingsSlice';

type Props = RootStackScreenProps<'EligibilityChecker'>;

export const EligibilityCheckerScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const hasPhilHealth = useAppSelector((state) => state.settings.hasPhilHealth);

  const setHasPhilHealthValue = (value: boolean | null) => {
    // Enable smooth transition for state resets or changes
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatch(setHasPhilHealth(value));
  };

  const handlePhilHealthLink = () => {
    Linking.openURL('https://www.philhealth.gov.ph/services/epr/');
  };

  const handleMap = () => {
    const query = 'PhilHealth Local Health Insurance Office';
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(query)}`,
      android: `geo:0,0?q=${encodeURIComponent(query)}`,
    });
    if (url) Linking.openURL(url);
  };

  const renderBenefitsCard = () => (
    <View
      style={[
        styles.benefitsWrapper,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
          borderRadius: 16,
        },
      ]}
    >
      <View style={styles.benefitHeader}>
        <Text variant="labelLarge" style={[styles.benefitLabel, { color: theme.colors.primary }]}>
          CORE BENEFIT
        </Text>
        <Text variant="headlineSmall" style={[styles.mainBenefit, { color: theme.colors.onSurface }]}>
          Primary Care
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 }}
        >
          Regular check-ups and consultations with your chosen provider at no cost.
        </Text>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.colors.outlineVariant, opacity: 0.5 }]}
      />

      <View style={styles.supplementarySection}>
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.onSurface, marginBottom: 12, opacity: 0.6 }}
        >
          INCLUDED COVERAGE
        </Text>

        <View style={styles.benefitList}>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              • <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Free</Text> Lab Tests
              & Diagnostics
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              • <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>₱20,000</Text> Annual
              Medicine Allowance
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              • <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Early Detection
              </Text>{' '}
              Cancer Screenings
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (hasPhilHealth === true) {
      return (
        <View>
          <View style={styles.successHeader}>
            <Text
              variant="headlineMedium"
              style={[styles.successTitle, { color: theme.colors.primary }]}
            >
              You’re Eligible!
            </Text>
            <Text
              variant="bodyLarge"
              style={[
                styles.successSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Since you have a PhilHealth PIN, you can join YAKAP immediately.
            </Text>
          </View>

          <View style={{ marginBottom: 32 }}>{renderBenefitsCard()}</View>

          <Button
            variant="primary"
            onPress={() => navigation.navigate('EnrollmentPathway')}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            title="Choose Enrollment Method"
          />

          <View style={styles.secondaryActions}>
            <Button
              variant="text"
              onPress={() => setHasPhilHealthValue(null)}
              style={styles.ghostDecisionButton}
              contentStyle={styles.buttonContent}
              title="Change my answer"
            />
          </View>
        </View>
      );
    }

    if (hasPhilHealth === false) {
      return (
        <View>
          <View style={styles.sectionHeader}>
            <Text
              variant="headlineMedium"
              style={[styles.guidanceTitle, { color: theme.colors.onSurface }]}
            >
              Obtain your PhilHealth PIN
            </Text>
          </View>
          <Text
            variant="bodyLarge"
            style={[styles.guidanceText, { color: theme.colors.onSurfaceVariant }]}
          >
            Every Filipino is eligible for PhilHealth. You just need to register to get your PIN,
            then you can join YAKAP.
          </Text>

          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, color: theme.colors.onSurface, fontWeight: 'bold' }}
          >
            Choose your registration path:
          </Text>

          <View
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}
            >
              1. Online Registration
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}
            >
              The fastest way if you have internet access.
            </Text>
            <Button
              variant="primary"
              onPress={handlePhilHealthLink}
              contentStyle={styles.buttonContent}
              title="Visit PhilHealth Website"
            />
          </View>

          <View
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}
            >
              2. Visit Local Office
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}
            >
              Go to the nearest PhilHealth Local Health Insurance Office.
            </Text>
            <Button
              variant="primary"
              onPress={handleMap}
              contentStyle={styles.buttonContent}
              title="Find Nearest Office"
            />
          </View>

          <View
            style={{
              marginVertical: 24,
              padding: 16,
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.primary,
            }}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onPrimaryContainer,
                fontWeight: '500',
                lineHeight: 20,
              }}
            >
              Once you receive your PIN, return to this app to complete your YAKAP enrollment.
            </Text>
          </View>

          <View style={styles.secondaryActions}>
            <Button
              variant="text"
              onPress={() => setHasPhilHealthValue(null)}
              style={styles.ghostDecisionButton}
              contentStyle={styles.buttonContent}
              title="Change my answer"
            />
          </View>
        </View>
      );
    }

    // Default: Initial question (hasPhilHealth is null or undefined)
    return (
      <View style={styles.centeredContent}>
        <Text
          variant="headlineMedium"
          style={[styles.questionText, { color: theme.colors.onSurface }]}
        >
          Do you have a PhilHealth Identification Number (PIN)?
        </Text>

        <Text
          variant="bodyLarge"
          style={[styles.consolidatedSubText, { color: theme.colors.onSurfaceVariant }]}
        >
          The YAKAP program is an additional benefit for PhilHealth members and is required for
          enrollment.
        </Text>

        <View style={styles.buttonGroup}>
          <Button
            variant="primary"
            onPress={() => setHasPhilHealthValue(true)}
            style={[styles.decisionButton, { minHeight: 56 }]}
            contentStyle={styles.buttonContent}
            title="Yes, I have PhilHealth"
          />
          <Button
            variant="text"
            onPress={() => setHasPhilHealthValue(false)}
            style={[styles.decisionButton, { minHeight: 56 }]}
            contentStyle={styles.buttonContent}
            title="No, I don't have it yet"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Eligibility Check" showBackButton />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },
  centeredContent: {
    flex: 1,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  questionText: {
    textAlign: 'left',
    marginBottom: 16,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  consolidatedSubText: {
    textAlign: 'left',
    marginBottom: 40,
    opacity: 0.8,
    lineHeight: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  decisionButton: {
    width: '100%',
  },
  ghostDecisionButton: {
    width: '100%',
  },
  successHeader: {
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 8,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSubtitle: {
    textAlign: 'left',
    lineHeight: 24,
    opacity: 0.8,
  },
  benefitsWrapper: {
    padding: 20,
  },
  benefitHeader: {
    marginBottom: 16,
  },
  benefitLabel: {
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 4,
  },
  mainBenefit: {
    fontWeight: 'bold',
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
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginTop: 8,
    minHeight: 56,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  secondaryActions: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  sectionHeader: {
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  guidanceTitle: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  guidanceText: {
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'left',
    opacity: 0.8,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
});
