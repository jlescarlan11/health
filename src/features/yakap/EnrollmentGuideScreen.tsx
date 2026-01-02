import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Checkbox, Button, ProgressBar, ActivityIndicator, Divider } from 'react-native-paper';
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
import { selectUser } from '../../store/authSlice';

import { uploadFileToFirebase } from '../../services/storageService';

const EnrollmentGuideScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

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

  // Auto-save functionality
  useEffect(() => {
    if (isLoggedIn && user) {
      const interval = setInterval(() => {
        // Simulate saving to backend
        setLastSaved(new Date());
        // In a real app, we would dispatch a thunk to sync with backend here
        // dispatch(syncEnrollmentProgress());
        console.log('Auto-saving progress...');
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

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
    if (!isLoggedIn) {
      Alert.alert("Authentication Required", "Please log in to save your progress permanently.");
      return;
    }
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
      const userId = user?.uid || 'guest';
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StandardHeader title="Enrollment Guide" showBackButton />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.pathwayName}>{pathway.name}</Text>
          <Text style={styles.stepCounter}>Step {currentStep + 1} of {totalSteps}</Text>
          <ProgressBar progress={progress} color="#2E7D32" style={styles.progressBar} />
          <Text style={styles.completionText}>{completionPercentage}% Completed</Text>
        </View>

        <View style={styles.card}>
            <View style={styles.stepHeader}>
                <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{currentStep + 1}</Text>
                </View>
                <Text style={styles.stepTitle}>Current Instruction</Text>
            </View>
            
            <Text style={styles.instructionText}>{currentStepData}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={styles.tipsSection}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#F57C00" />
                <Text style={styles.tipsText}>
                    Tip: Ensure all information provided matches your official documents to avoid delays.
                </Text>
            </View>

            {/* Document Upload Section */}
            <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Required Documents</Text>
                <Text style={styles.uploadHint}>Attach any relevant files for this step (optional).</Text>
                
                {uploadedDocuments[currentStep] ? (
                    <View style={styles.filePreview}>
                        <MaterialCommunityIcons name="file-check" size={24} color="#2E7D32" />
                        <Text style={styles.fileName} numberOfLines={1}>
                            Document Attached
                        </Text>
                        <Button mode="text" onPress={handleUploadDocument} disabled={uploading}>
                            Replace
                        </Button>
                    </View>
                ) : (
                    <Button 
                        mode="outlined" 
                        onPress={handleUploadDocument} 
                        loading={uploading}
                        icon="upload"
                        style={styles.uploadButton}
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
                    color="#2E7D32"
                />
                <Text style={styles.checkboxLabel}>Mark this step as completed</Text>
            </TouchableOpacity>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
            <Button 
                mode="outlined" 
                onPress={handlePrevious} 
                disabled={currentStep === 0}
                style={styles.navButton}
            >
                Previous
            </Button>
            <Button 
                mode="contained" 
                onPress={handleNext} 
                style={styles.navButton}
                buttonColor="#2E7D32"
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
            >
                Save Progress manually
            </Button>
            {lastSaved && (
                <Text style={styles.lastSavedText}>
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
    backgroundColor: '#F5F5F5',
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
    color: '#333',
    marginBottom: 8,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    textAlign: 'right',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  instructionText: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  tipsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#EF6C00',
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  uploadHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  uploadButton: {
    borderColor: '#2E7D32',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    color: '#2E7D32',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
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
    color: '#999',
    marginTop: 4,
  },
});

export default EnrollmentGuideScreen;
