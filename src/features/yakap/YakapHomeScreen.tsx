import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  List,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import HeroSection from '../../components/heroes/HeroSection';
import { Button } from '../../components/common/Button';
import { YAKAP_BENEFITS, YAKAP_FAQS, YakapBenefit } from './yakapContent';
import { YakapStackScreenProps } from '../../types/navigation';

const YakapHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<YakapStackScreenProps<'YakapHome'>['navigation']>();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAccordionPress = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const navigateToEnrollment = () => {
    // Always start fresh for the informational guide
    navigation.navigate('EligibilityChecker');
  };

  const navigateToFacilities = () => {
    // Navigate to the Find tab, then to FacilityDirectory with filter
    navigation.navigate('Find', {
      screen: 'FacilityDirectory',
      params: { filter: 'yakap' },
    });
  };

  const renderBenefitItem = (benefit: YakapBenefit, index: number) => (
    <View key={benefit.id}>
      <View style={styles.benefitItemContent}>
        <View style={[styles.benefitIconContainer, { backgroundColor: theme.colors.primaryContainer, padding: 10, borderRadius: 12 }]}>
          <MaterialCommunityIcons
            name={benefit.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.benefitTextContainer}>
          <Text variant="titleMedium" style={styles.benefitTitle}>
            {benefit.category}
          </Text>
          <Text variant="bodySmall" style={styles.benefitDesc}>
            {benefit.description}
          </Text>
        </View>
      </View>
      {index < YAKAP_BENEFITS.length - 1 && (
        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Hero Section */}
        <HeroSection
          colors={[theme.colors.primaryContainer, theme.colors.background]}
          height={320}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoPlaceholder}>
              <MaterialCommunityIcons name="heart-pulse" size={60} color={theme.colors.primary} />
            </View>
            <Text variant="headlineMedium" style={styles.heroTitle}>
              YAKAP Program
            </Text>
            <Text variant="titleMedium" style={styles.heroSubtitle}>
              Yaman, Kalinga, at Pag-aaruga
            </Text>
            <Text style={styles.heroDesc}>
              Every Filipino is eligible—no age limits or income restrictions. Follow our step-by-step guide to learn how you can enroll in the YAKAP program and start accessing free healthcare benefits.
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
            variant="outline"
            onPress={navigateToFacilities}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            title="Find YAKAP Clinics"
          />
        </View>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>
            Key Benefits
          </Text>
          <View style={styles.benefitsList}>
            {YAKAP_BENEFITS.map((benefit, index) => renderBenefitItem(benefit, index))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>
            Frequently Asked Questions
          </Text>
          {YAKAP_FAQS.slice(0, 5).map((faq) => (
            <List.Accordion
              key={faq.id}
              title={faq.question}
              id={faq.id}
              expanded={expandedId === faq.id}
              onPress={() => handleAccordionPress(faq.id)}
              titleNumberOfLines={2}
              style={{ backgroundColor: theme.colors.background }}
              left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
            >
              <List.Item 
                title={faq.answer} 
                titleNumberOfLines={10} 
                descriptionNumberOfLines={10}
                style={{ backgroundColor: theme.colors.background }}
              />
            </List.Accordion>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  logoPlaceholder: {
    marginBottom: 10,
  },
  heroTitle: {
    fontWeight: 'bold',
  },
  heroSubtitle: {
    opacity: 0.7,
  },
  heroDesc: {
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 16,
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
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    marginLeft: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  benefitsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  benefitItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  benefitIconContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 2,
  },
  benefitDesc: {
    textAlign: 'left',
    lineHeight: 18,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.1,
  },
});

export default YakapHomeScreen;