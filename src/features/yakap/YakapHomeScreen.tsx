import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  IconButton,
  useTheme,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import StandardHeader from '../../components/common/StandardHeader';
import { YAKAP_BENEFITS, YAKAP_FAQS, ELIGIBILITY_INFO, YakapBenefit } from './yakapContent';
import { YakapStackParamList } from '../../navigation/types';

type YakapScreenNavigationProp = StackNavigationProp<YakapStackParamList, 'YakapHome'>;

const YakapHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<YakapScreenNavigationProp>();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEligibilityDialogVisible, setIsEligibilityDialogVisible] = useState(false);

  const showEligibility = () => setIsEligibilityDialogVisible(true);
  const hideEligibility = () => setIsEligibilityDialogVisible(false);

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

  const renderBenefitCard = (benefit: YakapBenefit) => (
    <Card key={benefit.id} style={styles.benefitCard}>
      <Card.Content style={styles.benefitCardContent}>
        <View style={styles.benefitIconContainer}>
          <MaterialCommunityIcons
            name={benefit.icon as any}
            size={32}
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
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StandardHeader
        title="YAKAP"
        rightActions={<IconButton icon="information" onPress={showEligibility} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.colors.primaryContainer }]}>
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
          
          <View style={styles.heroDivider} />

          <View style={styles.eligibilityContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons
                name="party-popper"
                size={20}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                Every Filipino is Eligible!
              </Text>
            </View>
            <Text variant="bodySmall" style={{ textAlign: 'center', opacity: 0.8 }}>
              No age limits. No income restrictions. Just healthcare for all.
            </Text>
          </View>
        </View>

        {/* Start Enrollment Call to Action */}
        <Card style={styles.ctaCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.ctaTitle}>How to Enroll</Text>
            <Text variant="bodyMedium" style={styles.ctaDesc}>
              Follow our step-by-step guide to learn how you can enroll in the YAKAP program and start accessing free healthcare benefits.
            </Text>
            <Button mode="contained" onPress={navigateToEnrollment} style={styles.ctaButton}>
              Start Enrollment Guide
            </Button>
          </Card.Content>
        </Card>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>
            Key Benefits
          </Text>
          <View style={styles.benefitsGrid}>
            {YAKAP_BENEFITS.map(renderBenefitCard)}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="hospital-marker"
            onPress={navigateToFacilities}
            style={[styles.actionBtn, { borderColor: theme.colors.primary }]}
          >
            Find YAKAP Clinics
          </Button>
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
              left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
            >
              <List.Item title={faq.answer} titleNumberOfLines={10} descriptionNumberOfLines={10} />
            </List.Accordion>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={isEligibilityDialogVisible} onDismiss={hideEligibility}>
          <Dialog.Title>Eligibility Criteria</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {ELIGIBILITY_INFO.mainText}
            </Paragraph>
            <ScrollView style={{ maxHeight: 200 }}>
              {ELIGIBILITY_INFO.points.map((point, index) => (
                <View key={index} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ marginRight: 8 }}>•</Text>
                  <Text>{point}</Text>
                </View>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideEligibility}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  heroSection: {
    alignItems: 'center',
    padding: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  ctaCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
    elevation: 2,
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
  benefitsGrid: {
    paddingHorizontal: 16,
    flexDirection: 'column',
    gap: 12,
  },
  benefitCard: {
    width: '100%',
    height: 'auto',
  },
  benefitCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIconContainer: {
    marginRight: 16,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitIcon: {
    // Removed marginBottom and alignSelf as they are handled by container
  },
  benefitTitle: {
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 2,
  },
  benefitDesc: {
    textAlign: 'left',
    lineHeight: 16,
  },
  actionButtons: {
    padding: 16,
    gap: 10,
  },
  actionBtn: {},
  heroDesc: {
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: '100%',
    marginVertical: 16,
  },
  eligibilityContainer: {
    alignItems: 'center',
  },
});

export default YakapHomeScreen;