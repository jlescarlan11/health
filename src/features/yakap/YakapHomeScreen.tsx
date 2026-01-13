import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import HeroSection from '../../components/heroes/HeroSection';
import { Button } from '../../components/common/Button';
import StandardHeader from '../../components/common/StandardHeader';
import { YAKAP_BENEFITS, YakapBenefit } from './yakapContent';
import { YakapStackScreenProps } from '../../types/navigation';

const YakapHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<YakapStackScreenProps<'YakapHome'>['navigation']>();

  const navigateToEnrollment = () => {
    navigation.navigate('EligibilityChecker');
  };

  const navigateToFacilities = () => {
    navigation.navigate('Find', {
      screen: 'FacilityDirectory',
      params: { filter: 'yakap' },
    });
  };

  const navigateToFaq = () => {
    navigation.navigate('YakapFaq');
  };

  const renderBenefitItem = (benefit: YakapBenefit) => {
    return (
      <View
        key={benefit.id}
        style={[
          styles.benefitCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.benefitIconContainer}>
          <MaterialCommunityIcons
            name={benefit.icon as any}
            size={36}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.benefitTextContainer}>
          <Text style={[styles.benefitTitle, { color: theme.colors.onSurface }]}>
            {benefit.category}
          </Text>
          <Text style={[styles.benefitDesc, { color: theme.colors.onSurfaceVariant }]}>
            {benefit.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StandardHeader title="YAKAP" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Hero Section */}
        <HeroSection colors={[theme.colors.background, theme.colors.background]} height={220}>
          <View style={styles.heroContent}>
            <Text variant="headlineMedium" style={styles.heroTitle}>
              YAKAP Program
            </Text>
            <Text variant="titleMedium" style={styles.heroSubtitle}>
              Yaman, Kalinga, at Pag-aaruga
            </Text>
            <Text style={styles.heroDesc}>
              Every Filipino is eligible. Follow our step-by-step guide to learn how you can enroll
              in the YAKAP program and start accessing free healthcare benefits.
            </Text>
          </View>
        </HeroSection>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button
            variant="primary"
            onPress={navigateToEnrollment}
            style={styles.ctaButton}
            contentStyle={styles.buttonContent}
            title="Start Enrollment Guide"
          />
          <Button
            variant="text"
            onPress={navigateToFacilities}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            title="Find YAKAP Clinics"
          />
        </View>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
            Key Benefits
          </Text>
          <View style={styles.benefitsList}>
            {YAKAP_BENEFITS.map((benefit) => renderBenefitItem(benefit))}
          </View>
        </View>

        {/* FAQ Link */}
        <View style={styles.footer}>
          <Button
            variant="text"
            onPress={navigateToFaq}
            title="Frequently Asked Questions"
            labelStyle={[styles.faqLinkLabel, { color: theme.colors.outline }]}
            icon="information-outline"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontWeight: 'bold',
  },
  heroSubtitle: {
    opacity: 0.7,
  },
  heroDesc: {
    textAlign: 'left',
    marginTop: 10,
    opacity: 0.8,
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  ctaButton: {
    borderRadius: 8,
  },
  secondaryButton: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
  },
  sectionHeader: {
    marginLeft: 16,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  benefitsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  benefitIconContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'left',
    lineHeight: 20,
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  faqLinkLabel: {
    fontSize: 14,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
});

export default YakapHomeScreen;