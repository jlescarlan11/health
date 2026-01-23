import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  LayoutAnimation,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { YakapBenefitsCard } from '../../components/features/yakap';
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
    Linking.openURL('https://memberinquiry.philhealth.gov.ph/member/pinApplication.xhtml');
  };

  const renderContent = () => {
    if (hasPhilHealth === true) {
      return (
        <View style={styles.fadeContainer}>
          <View style={styles.successHeader}>
            <Text
              variant="headlineSmall"
              style={[styles.successTitle, { color: theme.colors.onSurface }]}
            >
              You are Eligible!
            </Text>
            <Text
              variant="bodyLarge"
              style={[styles.successSubtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Since you have a PhilHealth PIN, you can join YAKAP immediately.
            </Text>
          </View>

          <View style={{ marginBottom: 48 }}>
            <YakapBenefitsCard />
          </View>

          <Button
            variant="primary"
            onPress={() => navigation.navigate('EnrollmentPathway')}
            style={styles.actionButton}
            title="Choose Enrollment Method"
          />

          <View style={styles.secondaryActions}>
            <Button
              variant="text"
              onPress={() => setHasPhilHealthValue(null)}
              style={styles.ghostDecisionButton}
              title="Change my answer"
            />
          </View>
        </View>
      );
    }

    if (hasPhilHealth === false) {
      return (
        <View style={styles.fadeContainer}>
          <View style={styles.sectionHeader}>
            <Text
              variant="headlineSmall"
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
            variant="labelLarge"
            style={{
              marginBottom: 20,
              color: theme.colors.onSurface,
              fontWeight: '800',
              letterSpacing: 1,
              opacity: 0.6,
            }}
          >
            CHOOSE REGISTRATION PATH:
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePhilHealthLink}
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.colors.surface,
                // Refined soft shadow
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              },
            ]}
          >
            <View style={styles.optionContent}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: 'bold',
                    fontSize: 18,
                    marginBottom: 6,
                  }}
                >
                  Online Registration
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, opacity: 0.8 }}>
                  The fastest way if you have internet access.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.primary}
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>

          <Text
            variant="bodyMedium"
            style={[styles.inPersonNote, { color: theme.colors.onSurfaceVariant }]}
          >
            Prefer in-person registration? Visit your nearest PhilHealth office for assistance.
          </Text>

          <View style={styles.secondaryActions}>
            <Button
              variant="text"
              onPress={() => setHasPhilHealthValue(null)}
              style={styles.ghostDecisionButton}
              title="Change my answer"
            />
          </View>
        </View>
      );
    }

    // Default: Initial question (hasPhilHealth is null or undefined)
    return (
      <View style={styles.initialSection}>
        <Text
          variant="headlineSmall"
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
            style={styles.decisionButton}
            title="Yes, I have PhilHealth"
          />
          <Button
            variant="text"
            onPress={() => setHasPhilHealthValue(false)}
            style={styles.decisionButton}
            title="No, I don't have it yet"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
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
  fadeContainer: {
    flex: 1,
  },
  initialSection: {
    marginTop: 16,
  },
  questionText: {
    textAlign: 'left',
    marginBottom: 24,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  consolidatedSubText: {
    textAlign: 'left',
    marginBottom: 56,
    opacity: 0.8,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  decisionButton: {
    width: '100%',
  },
  ghostDecisionButton: {
    width: '100%',
  },
  successHeader: {
    alignItems: 'flex-start',
    marginBottom: 40,
    marginTop: 8,
  },
  successTitle: {
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    textAlign: 'left',
    lineHeight: 26,
    opacity: 0.8,
  },
  actionButton: {
    marginTop: 8,
  },
  secondaryActions: {
    marginTop: 16,
    alignItems: 'center',
  },
  sectionHeader: {
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  guidanceTitle: {
    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: -0.5,
  },
  guidanceText: {
    marginBottom: 40,
    lineHeight: 26,
    textAlign: 'left',
    opacity: 0.8,
  },
  optionCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inPersonNote: {
    marginTop: 12,
    lineHeight: 22,
    opacity: 0.85,
  },
});
