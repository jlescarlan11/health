import React from 'react';
import { View, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
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
        <Text variant="titleSmall" style={[styles.benefitLabel, { color: theme.colors.primary }]}>
          CORE BENEFIT
        </Text>
        <Text variant="titleLarge" style={[styles.mainBenefit, { color: theme.colors.onSurface }]}>
          Primary Care
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}
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
          style={{ color: theme.colors.onSurface, marginBottom: 16, opacity: 0.6 }}
        >
          INCLUDED COVERAGE
        </Text>

        <View style={styles.benefitList}>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Free</Text> Lab Tests
              & Diagnostics
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>₱20,000</Text> Annual
              Medicine Allowance
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
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
                { color: theme.colors.onSurfaceVariant, opacity: 0.8 },
              ]}
            >
              Since you have a PhilHealth PIN, you can join YAKAP immediately.
            </Text>
          </View>

          <View style={{ marginBottom: 40 }}>{renderBenefitsCard()}</View>

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
          <View style={styles.successHeader}>
            <Text
              variant="headlineMedium"
              style={[styles.guidanceTitle, { color: theme.colors.onSurface }]}
            >
              Step 1: Obtain your PhilHealth PIN
            </Text>
          </View>
          <Text
            variant="bodyLarge"
            style={[styles.guidanceText, { color: theme.colors.onSurfaceVariant, opacity: 0.7 }]}
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
            style={{
              padding: 16,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}
            >
              1. Online Registration
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}
            >
              The fastest way if you have internet access.
            </Text>
            <Button
              variant="outline"
              onPress={handlePhilHealthLink}
              title="Visit PhilHealth Website"
            />
          </View>

          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}
            >
              2. Visit Local Office
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}
            >
              Go to the nearest PhilHealth Local Health Insurance Office.
            </Text>
            <Button variant="outline" onPress={handleMap} title="Find Nearest Office" />
          </View>

          <View
            style={{
              marginVertical: 16,
              padding: 16,
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: 12,
            }}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onPrimaryContainer,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              Once you receive your PIN, return to this app to complete your YAKAP enrollment.
            </Text>
          </View>

          <View style={styles.helpSection}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              Need Assistance?
            </Text>
            <View style={styles.contactRow}>
              <Text
                variant="bodyMedium"
                style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}
              >
                Hotline: (02) 8441-7442
              </Text>
            </View>
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
        <View style={styles.heroSection} />

        <Text
          variant="headlineSmall"
          style={[styles.questionText, { color: theme.colors.onSurface }]}
        >
          Do you have a PhilHealth Identification Number (PIN)?
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.consolidatedSubText, { color: theme.colors.onSurfaceVariant }]}
        >
          The YAKAP program is an additional benefit for PhilHealth members and is required for
          enrollment.
        </Text>

        <View style={styles.buttonGroup}>
          <Button
            variant="primary"
            onPress={() => setHasPhilHealthValue(true)}
            style={styles.decisionButton}
            contentStyle={styles.buttonContent}
            title="Yes, I have PhilHealth"
          />
          <Button
            variant="text"
            onPress={() => setHasPhilHealthValue(false)}
            style={styles.decisionButton}
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  questionText: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
    fontSize: 24,
    lineHeight: 32,
  },
  consolidatedSubText: {
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.7,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  subText: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    marginTop: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  decisionButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
  },
  ghostDecisionButton: {
    width: '100%',
    justifyContent: 'center',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 32,
  },
  successTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  successSubtitle: {
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  benefitsWrapper: {
    padding: 24,
    marginBottom: 12,
  },
  benefitHeader: {
    marginBottom: 20,
  },
  benefitLabel: {
    letterSpacing: 1.5,
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
    marginVertical: 20,
  },
  supplementarySection: {
    width: '100%',
  },
  benefitList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginTop: 8,
  },
  secondaryActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  guidanceTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  guidanceText: {
    marginBottom: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  helpSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  contactText: {
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontStyle: 'italic',
  },
});
