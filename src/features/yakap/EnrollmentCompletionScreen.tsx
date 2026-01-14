import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { YAKAP_BENEFITS } from './yakapContent';

type EnrollmentCompletionNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EnrollmentCompletion'
>;

const EnrollmentCompletionScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentCompletionNavigationProp>();

  const navigateToFacilities = () => {
    // Navigate to Find tab with YAKAP filter
    // @ts-ignore - cross-tab navigation
    navigation.navigate('Find', {
      screen: 'FacilityDirectory',
      params: { filter: 'yakap' },
    });
  };

  const handleBackToHome = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Guide Complete" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.celebrationContainer}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Enrollment Guide Complete
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            You now have all the information needed to finalize your enrollment. Visit an accredited
            health center to start receiving your benefits.
          </Text>
        </View>

        <View
          style={[
            styles.benefitsSection,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              // Subtle drop shadow
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.accentLine, { backgroundColor: theme.colors.secondary }]} />
            <Text
              variant="titleMedium"
              style={[styles.benefitsHeader, { color: theme.colors.onSurface }]}
            >
              Your YAKAP Benefits
            </Text>
          </View>

          {YAKAP_BENEFITS.slice(0, 3).map((benefit, index) => (
            <View
              key={benefit.id}
              style={[
                styles.benefitItem,
                index === 0 && styles.firstBenefit,
                index === 2 && styles.lastBenefit,
              ]}
            >
              <View style={[styles.bulletPoint, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.benefitTextContent}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                  {benefit.category}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.benefitDesc, { color: theme.colors.onSurfaceVariant }]}
                >
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            onPress={navigateToFacilities}
            title="Find Nearest YAKAP Clinic"
          />

          <Button
            variant="text"
            onPress={handleBackToHome}
            title="Return to YAKAP Home"
          />
        </View>

        <View style={{ height: 100 }} />
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
    flexGrow: 1,
  },
  celebrationContainer: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'left',
    marginTop: 16,
    lineHeight: 24,
  },
  benefitsSection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    elevation: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  accentLine: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: 10,
  },
  benefitsHeader: {
    fontWeight: '600',
  },
  benefitItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  firstBenefit: {
    paddingTop: 0,
  },
  lastBenefit: {
    paddingBottom: 0,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitDesc: {
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.8,
  },
  actionContainer: {
    gap: 12,
  },
});

export default EnrollmentCompletionScreen;
