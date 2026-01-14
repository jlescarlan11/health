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
          <Text style={[styles.stepCounter, { color: theme.colors.onSurfaceVariant }]}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
          <ProgressBar
            progress={progress}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
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

          <View style={[styles.tipsSection, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={24}
              color={theme.colors.secondary}
            />
            <Text style={[styles.tipsText, { color: theme.colors.onSecondaryContainer }]}>
              Tip: Ensure all information provided matches your official documents to avoid delays.
            </Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <Button
            variant="text"
            onPress={handlePrevious}
            disabled={currentStep === 0}
            style={styles.navButton}
            contentStyle={styles.buttonContent}
            title="Previous"
          />
          <Button
            variant="primary"
            onPress={handleNext}
            style={styles.navButton}
            contentStyle={styles.buttonContent}
            title={currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>Need Assistance?</Text>
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
    marginBottom: 24,
  },
  pathwayName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepCounter: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  divider: {
    marginBottom: 20,
  },
  tipsSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});


export default EnrollmentGuideScreen;
