import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
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

  const navigateToProfile = () => {
    navigation.navigate('Home', { screen: 'Profile' });
  };

  const renderBenefitItem = (benefit: YakapBenefit) => {
    return (
      <View key={benefit.id} style={styles.benefitCard}>
        <View
          style={[
            styles.benefitIconContainer,
            { backgroundColor: theme.colors.primaryContainer + '60' },
          ]}
        >
          <MaterialCommunityIcons
            name={benefit.icon as keyof (typeof MaterialCommunityIcons)['glyphMap']}
            size={32}
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <StandardHeader title="YAKAP" showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View
          style={[styles.heroSection, { backgroundColor: theme.colors.primaryContainer + '30' }]}
        >
          <View style={styles.heroContent}>
            <Text
              variant="headlineMedium"
              style={[styles.heroTitle, { color: theme.colors.onSurface }]}
            >
              YAKAP Program
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.heroSubtitle, { color: theme.colors.primary }]}
            >
              Yaman ng Kalusugan Program
            </Text>
            <View style={[styles.heroAccent, { backgroundColor: theme.colors.secondary }]} />
            <Text style={[styles.heroDesc, { color: theme.colors.onSurfaceVariant }]}>
              Every Filipino is eligible. Follow our step-by-step guide to learn how you can enroll
              in the YAKAP program and start accessing free healthcare benefits.
            </Text>
          </View>
        </View>

        {/* Digital ID CTA */}
        <View style={styles.idContainer}>
          <Card
            onPress={navigateToProfile}
            style={[styles.idCard, { backgroundColor: theme.colors.primaryContainer + '40' }]}
            mode="contained"
          >
            <View style={styles.idCardContent}>
              <View
                style={[
                  styles.idIconContainer,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.idTextContainer}>
                <Text variant="titleMedium" style={styles.idTitle}>
                  My Digital ID
                </Text>
                <Text variant="bodySmall" style={styles.idSubtitle}>
                  View and manage your health profile for faster processing at health centers.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button variant="primary" onPress={navigateToEnrollment} title="Start Enrollment Guide" />
          <Button variant="text" onPress={navigateToFacilities} title="Find YAKAP Clinics" />
        </View>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text
            variant="labelLarge"
            style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}
          >
            KEY BENEFITS
          </Text>
          <View style={styles.benefitsList}>
            {YAKAP_BENEFITS.map((benefit, index) => (
              <React.Fragment key={benefit.id}>
                {renderBenefitItem(benefit)}
                {index < YAKAP_BENEFITS.length - 1 && (
                  <View
                    style={[
                      styles.benefitDivider,
                      { backgroundColor: theme.colors.outlineVariant },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* FAQ Link */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={navigateToFaq}
            activeOpacity={0.7}
            style={styles.faqLinkContainer}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={theme.colors.onSurfaceVariant}
              style={styles.faqIcon}
            />
            <Text style={[styles.faqText, { color: theme.colors.onSurfaceVariant }]}>
              Frequently Asked Questions
            </Text>
          </TouchableOpacity>
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
  heroSection: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
    fontSize: 14,
  },
  heroAccent: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  heroDesc: {
    textAlign: 'left',
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  idContainer: {
    paddingHorizontal: 24,
    marginTop: -8,
    marginBottom: 24,
  },
  idCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.1)',
  },
  idCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  idIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  idTextContainer: {
    flex: 1,
  },
  idTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  idSubtitle: {
    opacity: 0.7,
    lineHeight: 16,
  },
  actionButtonsContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
    gap: 12,
  },
  section: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    marginBottom: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 12,
    opacity: 0.6,
  },
  benefitsList: {
    backgroundColor: 'transparent',
  },
  benefitCard: {
    flexDirection: 'row',
    paddingVertical: 24,
    alignItems: 'center',
  },
  benefitIconContainer: {
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  benefitDesc: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'left',
    lineHeight: 22,
    opacity: 0.8,
  },
  benefitDivider: {
    height: 1,
    opacity: 0.1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  faqLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    opacity: 0.6,
  },
  faqIcon: {
    marginRight: 8,
  },
  faqText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
});

export default YakapHomeScreen;
