import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  IconButton,
  useTheme,
  ProgressBar,
  Chip,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import StandardHeader from '../../components/common/StandardHeader';
import { RootState } from '../../store';
import { YAKAP_BENEFITS, YAKAP_FAQS, ELIGIBILITY_INFO } from './yakapContent';
import { YakapStackParamList } from '../../navigation/types';
import { resetEnrollment } from '../../store/enrollmentSlice';

// We need to define a type that allows navigation to other stacks (like Find tab)
// For simplicity we'll use any for the navigate call to cross-stacks
type YakapScreenNavigationProp = StackNavigationProp<YakapStackParamList, 'YakapHome'>;

const YakapHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<YakapScreenNavigationProp>();
  const dispatch = useDispatch();
  const { enrollmentStatus, currentStep, selectedPathway } = useSelector(
    (state: RootState) => state.enrollment,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEligibilityDialogVisible, setIsEligibilityDialogVisible] = useState(false);

  const showEligibility = () => setIsEligibilityDialogVisible(true);
  const hideEligibility = () => setIsEligibilityDialogVisible(false);

  const handleAccordionPress = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const navigateToEnrollment = () => {
    // If enrollment is already in progress, go to the guide directly
    if (enrollmentStatus === 'in_progress' && selectedPathway) {
      navigation.navigate('EnrollmentGuide');
    } else {
      // Start fresh
      navigation.navigate('EligibilityChecker');
    }
  };

  const handleReset = () => {
    dispatch(resetEnrollment());
  };

  const navigateToEligibility = () => {
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

  const renderBenefitCard = (benefit: any) => (
    <Card key={benefit.id} style={styles.benefitCard}>
      <Card.Content>
        <MaterialCommunityIcons
          name="medical-bag"
          size={32}
          color={theme.colors.primary}
          style={styles.benefitIcon}
        />
        <Text variant="titleMedium" style={styles.benefitTitle}>
          {benefit.category}
        </Text>
        <Text variant="bodySmall" style={styles.benefitDesc}>
          {benefit.description}
        </Text>
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
        </View>

        {/* Eligibility Banner */}
        <Card style={[styles.eligibilityBanner, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.eligibilityContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="party-popper"
                size={24}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text variant="titleLarge" style={[styles.eligibilityTitle, { color: theme.colors.primary }]}>
                Every Filipino is Eligible!
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              No age limits. No income restrictions. Just healthcare for all.
            </Text>
          </Card.Content>
        </Card>

        {/* Enrollment Status */}
        <Card style={styles.statusCard}>
          <Card.Title
            title="Enrollment Status"
            left={(props) => <MaterialCommunityIcons {...props} name="card-account-details" />}
          />
          <Card.Content>
            {enrollmentStatus === 'completed' ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Chip 
                    icon="check" 
                    style={[styles.enrolledChip, { backgroundColor: theme.colors.primaryContainer }]} 
                    textStyle={{ color: theme.colors.onPrimaryContainer }}
                  >
                    Enrolled
                  </Chip>
                  <Text style={{ marginLeft: 10, color: 'gray' }}>Enjoy your benefits!</Text>
                </View>
                <Button mode="contained" onPress={() => {}} style={styles.statusButton}>
                  View My Benefits
                </Button>

                {__DEV__ && (
                  <Button
                    mode="text"
                    onPress={handleReset}
                    textColor={theme.colors.error}
                    style={{ marginTop: 8 }}
                    icon="refresh"
                  >
                    Reset Progress (Dev Mode)
                  </Button>
                )}
              </View>
            ) : enrollmentStatus === 'in_progress' ? (
              <View>
                <Text style={{ marginBottom: 10 }}>Enrollment in progress...</Text>
                <ProgressBar
                  progress={0.5}
                  color={theme.colors.primary}
                  style={{ height: 8, borderRadius: 4 }}
                />
                <Button mode="contained" onPress={navigateToEnrollment} style={styles.statusButton}>
                  Continue Enrollment
                </Button>

                {__DEV__ && (
                  <Button
                    mode="text"
                    onPress={handleReset}
                    textColor={theme.colors.error}
                    style={{ marginTop: 8 }}
                    icon="refresh"
                  >
                    Reset (Dev Mode)
                  </Button>
                )}
              </View>
            ) : (
              <View>
                <Text style={{ marginBottom: 10 }}>You are not enrolled yet.</Text>
                <Button mode="contained" onPress={navigateToEnrollment}>
                  Start Enrollment
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Benefits Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>
            Key Benefits
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.benefitsScroll}
          >
            {YAKAP_BENEFITS.map(renderBenefitCard)}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="check-decagram"
            onPress={navigateToEligibility}
            style={[styles.actionBtn, { borderColor: theme.colors.primary }]}
          >
            Check Eligibility
          </Button>
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

        <View style={{ height: 24 }} />
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
  eligibilityBanner: {
    margin: 16,
  },
  eligibilityContent: {
    alignItems: 'center',
  },
  eligibilityTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
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
  benefitsScroll: {
    paddingLeft: 16,
  },
  benefitCard: {
    width: 200,
    marginRight: 10,
    height: 180, // Increased height to fit text
    justifyContent: 'center',
  },
  benefitIcon: {
    marginBottom: 10,
    alignSelf: 'center',
  },
  benefitTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  benefitDesc: {
    textAlign: 'center',
    lineHeight: 16,
  },
  statusCard: {
    margin: 16,
  },
  enrolledChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  statusButton: {
    marginTop: 10,
  },
  actionButtons: {
    padding: 16,
    gap: 10,
  },
  actionBtn: {},
});

export default YakapHomeScreen;
