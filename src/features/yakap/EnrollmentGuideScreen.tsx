import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Checkbox, Button, ProgressBar, ActivityIndicator, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import StandardHeader from '../../components/common/StandardHeader';
import { RootState } from '../../store';
import { 
  setStep, 
  toggleStepCompletion, 
  setUploadedDocument, 
  completeEnrollment 
} from '../../store/enrollmentSlice';
import { ENROLLMENT_PATHWAYS } from './yakapContent';

import { uploadFileToFirebase } from '../../services/storageService';

const EnrollmentGuideScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme(); // Use theme

  const { selectedPathway, currentStep, completedSteps, uploadedDocuments } = useSelector(
    (state: RootState) => state.enrollment
  );

  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const pathway = ENROLLMENT_PATHWAYS.find(p => p.id === selectedPathway);
  
  // Safety check: if no pathway selected, go back
  useEffect(() => {
    if (!pathway) {
      navigation.goBack();
    }
  }, [pathway, navigation]);

  if (!pathway) return null;

  const totalSteps = pathway.steps.length;
  const currentStepData = pathway.steps[currentStep];
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;
  const completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);

  // Auto-save functionality (Simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate saving progress locally
      setLastSaved(new Date());
      console.log('Auto-saving progress locally...');
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      dispatch(setStep(currentStep + 1));
    } else {
        // Option to finish?
        Alert.alert(
            "Enrollment Completed",
            "Congratulations! You have completed the enrollment guide.",
            [
                { text: "OK", onPress: () => {
                    dispatch(completeEnrollment());
                    navigation.goBack();
                }}
            ]
        );
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      dispatch(setStep(currentStep - 1));
    }
  };

  const handleToggleComplete = () => {
    dispatch(toggleStepCompletion(currentStep));
  };

  const handleSaveProgress = () => {
    // Simulate manual save
    setLastSaved(new Date());
    Alert.alert("Success", "Progress saved successfully.");
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setUploading(true);
      
      const asset = result.assets[0];
      const userId = 'local_user';
      // Path format: enrollment/{userId}/{pathwayId}/step_{stepIndex}/{fileName}
      const storagePath = `enrollment/${userId}/${selectedPathway}/step_${currentStep}/${asset.name}`;

      try {
        const downloadUrl = await uploadFileToFirebase(asset.uri, storagePath);
        
        dispatch(setUploadedDocument({ stepIndex: currentStep, url: downloadUrl }));
        Alert.alert("Upload Successful", `Document ${asset.name} attached to this step.`);
      } catch (uploadError) {
        console.error(uploadError);
        Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
      } finally {
        setUploading(false);
      }

    } catch (error) {
      console.error(error);
      setUploading(false);
      Alert.alert("Error", "Failed to select document.");
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
          <Text style={[styles.completionText, { color: theme.colors.onSurfaceVariant }]}>{completionPercentage}% Completed</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.stepNumberText, { color: theme.colors.primary }]}>{currentStep + 1}</Text>
                </View>
                <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>Current Instruction</Text>
            </View>
            
            <Text style={[styles.instructionText, { color: theme.colors.onSurface }]}>{currentStepData}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={[styles.tipsSection, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.colors.secondary} />
                <Text style={[styles.tipsText, { color: theme.colors.onSecondaryContainer }]}>
                    Tip: Ensure all information provided matches your official documents to avoid delays.
                </Text>
            </View>

            {/* Document Upload Section */}
            <View style={styles.uploadSection}>
                <Text style={[styles.uploadLabel, { color: theme.colors.onSurface }]}>Required Documents</Text>
                <Text style={[styles.uploadHint, { color: theme.colors.onSurfaceVariant }]}>Attach any relevant files for this step (optional).</Text>
                
                {uploadedDocuments[currentStep] ? (
                    <View style={[styles.filePreview, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="file-check" size={24} color={theme.colors.primary} />
                        <Text style={[styles.fileName, { color: theme.colors.primary }]} numberOfLines={1}>
                            Document Attached
                        </Text>
                        <Button mode="text" onPress={handleUploadDocument} disabled={uploading} textColor={theme.colors.primary}>
                            Replace
                        </Button>
                    </View>
                ) : (
                    <Button 
                        mode="outlined" 
                        onPress={handleUploadDocument} 
                        loading={uploading}
                        icon="upload"
                        style={[styles.uploadButton, { borderColor: theme.colors.primary }]}
                        textColor={theme.colors.primary}
                    >
                        Upload Document
                    </Button>
                )}
            </View>

            {/* Completion Checkbox */}
            <TouchableOpacity style={styles.checkboxContainer} onPress={handleToggleComplete}>
                <Checkbox
                    status={completedSteps.includes(currentStep) ? 'checked' : 'unchecked'}
                    onPress={handleToggleComplete}
                    color={theme.colors.primary}
                />
                <Text style={[styles.checkboxLabel, { color: theme.colors.onSurface }]}>Mark this step as completed</Text>
            </TouchableOpacity>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
            <Button 
                mode="outlined" 
                onPress={handlePrevious} 
                disabled={currentStep === 0}
                style={styles.navButton}
                textColor={theme.colors.primary}
            >
                Previous
            </Button>
            <Button 
                mode="contained" 
                onPress={handleNext} 
                style={styles.navButton}
                buttonColor={theme.colors.primary}
            >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            </Button>
        </View>

        {/* Save Progress & Status */}
        <View style={styles.footer}>
            <Button 
                mode="text" 
                onPress={handleSaveProgress}
                icon="content-save"
                textColor={theme.colors.primary}
            >
                Save Progress manually
            </Button>
            {lastSaved && (
                <Text style={[styles.lastSavedText, { color: theme.colors.onSurfaceVariant }]}>
                    Last saved: {lastSaved.toLocaleTimeString()}
                </Text>
            )}
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
  completionText: {
    fontSize: 12,
    textAlign: 'right',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  uploadSection: {
    marginBottom: 16,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 14,
    marginBottom: 12,
  },
  uploadButton: {
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 16,
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
  footer: {
    alignItems: 'center',
  },
  lastSavedText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default EnrollmentGuideScreen;
