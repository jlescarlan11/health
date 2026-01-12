import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import HeroSection from '../../components/heroes/HeroSection';
import { YAKAP_BENEFITS, YAKAP_FAQS, YakapBenefit } from './yakapContent';
import { YakapStackParamList } from '../../navigation/types';

type YakapScreenNavigationProp = StackNavigationProp<YakapStackParamList, 'YakapHome'>;

const YakapHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<YakapScreenNavigationProp>();
  
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
    // @ts-ignore - navigation types for cross-tab are complex, ensuring runtime works
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
            name={benefit.icon as any}
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
          height={280}
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
              Free primary care, medicines, and lab tests for every Naga City resident.
            </Text>
          </View>
        </HeroSection>

        {/* Start Enrollment Call to Action */}
        <Card style={[styles.ctaCard, { backgroundColor: theme.colors.background, elevation: 0 }]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.ctaTitle}>Get Started</Text>
            <Text variant="bodyMedium" style={styles.ctaDesc}>
              Every Filipino is eligible—no age limits or income restrictions. Follow our step-by-step guide to learn how you can enroll in the YAKAP program and start accessing free healthcare benefits.
            </Text>
            <Button mode="contained" onPress={navigateToEnrollment} style={styles.ctaButton}>
              Start Enrollment Guide
            </Button>
            <Button
              mode="outlined"
              icon="hospital-marker"
              onPress={navigateToFacilities}
              style={{ marginTop: 12, borderRadius: 8 }}
            >
              Find YAKAP Clinics
            </Button>
          </Card.Content>
        </Card>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>
            Key Benefits
          </Text>
          <Card style={{ marginHorizontal: 16, borderRadius: 16, backgroundColor: theme.colors.background, elevation: 0 }}>
            <Card.Content style={styles.benefitsList}>
              {YAKAP_BENEFITS.map((benefit, index) => renderBenefitItem(benefit, index))}
            </Card.Content>
          </Card>
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
  ctaCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  ctaTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ctaDesc: {
    marginBottom: 16,
    lineHeight: 20,
  },
  ctaButton: {
    borderRadius: 8,
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