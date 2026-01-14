import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ProgressBar, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { ENROLLMENT_PATHWAYS, OFFICIAL_CONTACTS } from './yakapContent';
import { RootStackParamList } from '../../types/navigation';

const EnrollmentGuideScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EnrollmentGuide'>>();
  const theme = useTheme();

  const { pathwayId } = route.params;

  const [currentStep, setCurrentStep] = useState(0);

  const pathway = ENROLLMENT_PATHWAYS.find((p) => p.id === pathwayId);

  useEffect(() => {
    if (!pathway) {
      navigation.goBack();
    }
  }, [pathway, navigation]);

  if (!pathway) return null;

  const totalSteps = pathway.steps.length;
  const currentStepData = pathway.steps[currentStep];
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // @ts-ignore - navigation to completion
      navigation.navigate('EnrollmentCompletion');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Enrollment Guide" showBackButton />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <Text style={[styles.pathwayName, { color: theme.colors.onSurface }]}>
            {pathway.name}
          </Text>
          <View style={styles.stepCounterRow}>
            <Text style={[styles.stepCounter, { color: theme.colors.onSurfaceVariant }]}>
              STEP {currentStep + 1} OF {totalSteps}
            </Text>
            <View style={styles.progressBarContainer}>
              <ProgressBar
                progress={progress}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            },
          ]}
        >
          <View style={styles.stepHeader}>
            <View
              style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Text style={[styles.stepNumberText, { color: theme.colors.primary }]}>
                {currentStep + 1}
              </Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>Instruction</Text>
          </View>

          <Text style={[styles.instructionText, { color: theme.colors.onSurface }]}>
            {currentStepData}
          </Text>

          <Divider style={styles.divider} />

          <View style={[styles.tipsSection, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.tipAccent, { backgroundColor: theme.colors.secondary }]} />
            <View style={styles.tipContent}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={20}
                color={theme.colors.onSurface}
                style={styles.tipIcon}
              />
              <Text style={[styles.tipsText, { color: theme.colors.onSurface }]}>
                Tip: Ensure all information provided matches your official documents to avoid delays.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <Button
            variant="text"
            onPress={handlePrevious}
            disabled={currentStep === 0}
            style={styles.navButton}
            title="Previous"
          />
          <Button
            variant="primary"
            onPress={handleNext}
            style={styles.navButton}
            title={currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
          <View style={styles.infoBoxHeader}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>Need Assistance?</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
            If you encounter any issues during the enrollment process, you can contact the PhilHealth Hotline at {OFFICIAL_CONTACTS.philhealth_hotline} or visit the nearest local office.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
    marginTop: 8,
  },
  pathwayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stepCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  progressBarContainer: {
    flex: 1,
    marginLeft: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  instructionText: {
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  divider: {
    marginBottom: 24,
    height: 1,
    opacity: 0.5,
  },
  tipsSection: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tipAccent: {
    width: 4,
  },
  tipContent: {
    flexDirection: 'row',
    padding: 16,
    flex: 1,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginTop: 2,
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  navButton: {
    flex: 1,
  },
  infoBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.1)',
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
});


export default EnrollmentGuideScreen;
