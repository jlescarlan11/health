import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ProgressBar, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { ENROLLMENT_PATHWAYS } from './yakapContent';
import { RootStackParamList } from '../../types/navigation';

const EnrollmentGuideScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EnrollmentGuide'>>();
  const theme = useTheme();

  const { pathwayId } = route.params;
  
  const [currentStep, setCurrentStep] = useState(0);

  const pathway = ENROLLMENT_PATHWAYS.find(p => p.id === pathwayId);
  
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <StandardHeader title="Enrollment Guide" showBackButton />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <Text style={[styles.pathwayName, { color: theme.colors.onSurface }]}>{pathway.name}</Text>
          <Text style={[styles.stepCounter, { color: theme.colors.onSurfaceVariant }]}>Step {currentStep + 1} of {totalSteps}</Text>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.stepNumberText, { color: theme.colors.primary }]}>{currentStep + 1}</Text>
                </View>
                <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>Instruction</Text>
            </View>
            
            <Text style={[styles.instructionText, { color: theme.colors.onSurface }]}>{currentStepData}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={[styles.tipsSection, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.colors.secondary} />
                <Text style={[styles.tipsText, { color: theme.colors.onSecondaryContainer }]}>
                    Tip: Ensure all information provided matches your official documents to avoid delays.
                </Text>
            </View>
        </View>

        <View style={styles.navigationButtons}>
            <Button 
                variant="outline" 
                onPress={handlePrevious} 
                disabled={currentStep === 0}
                style={styles.navButton}
                title="Previous"
            />
            <Button 
                variant="primary" 
                onPress={handleNext} 
                style={styles.navButton}
                title={currentStep === totalSteps - 1 ? "Finish" : "Next"}
            />
        </View>

        <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                This is an informational guide. Progress is not saved between sessions.
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
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 20,
  },
  pathwayName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepCounter: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 0,
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  tipsSection: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EnrollmentGuideScreen;