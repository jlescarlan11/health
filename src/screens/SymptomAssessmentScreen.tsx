import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, RadioButton, ProgressBar, ActivityIndicator, useTheme, IconButton, TextInput, Card } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CheckStackScreenProps } from '../types/navigation';
import { getGeminiResponse } from '../services/gemini';
import { CLARIFYING_QUESTIONS_PROMPT } from '../constants/prompts';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';

// Import common components
import StandardHeader from '../components/common/StandardHeader';
import { Button } from '../components/common/Button';

type ScreenRouteProp = CheckStackScreenProps<'SymptomAssessment'>['route'];
type NavigationProp = CheckStackScreenProps<'SymptomAssessment'>['navigation'];

interface Question {
  id: string;
  text: string;
  type: 'choice' | 'text';
  options?: string[];
}

const SymptomAssessmentScreen = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { initialSymptom } = route.params || { initialSymptom: '' };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Voice Input State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Animation for recording indicator
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Header height for KeyboardAvoidingView offset
  const headerHeight = 60;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight + insets.top : 0;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      fadeAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, fadeAnim]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      } else {
        Alert.alert('Permission Denied', 'Microphone permission is required for voice input.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setIsProcessingAudio(true);
    try {
      await recording.stopAndUnloadAsync();
      // Simulation of STT (Replace with actual API call)
      setTimeout(() => {
        const simulatedText = "I have been feeling this way for a few days.";
        setAnswers(prev => ({
          ...prev, 
          [questions[currentStep].id]: (prev[questions[currentStep].id] || '') + (prev[questions[currentStep].id] ? ' ' : '') + simulatedText
        }));
        setIsProcessingAudio(false);
        setRecording(null);
      }, 1500);
    } catch (error) {
       console.error(error);
       setIsProcessingAudio(false);
       Alert.alert('Error', 'Failed to process audio.');
    }
  };

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      Alert.alert(
        'Cancel Assessment',
        'Are you sure you want to start over? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Over', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [currentStep, navigation]);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <StandardHeader 
          title="Assessment" 
          showBackButton 
          onBackPress={handleBack} 
        />
      ),
    });
  }, [navigation, handleBack]);

  useEffect(() => {
    // Check for immediate escalation
    const emergencyCheck = detectEmergency(initialSymptom || '');
    const mentalHealthCheck = detectMentalHealthCrisis(initialSymptom || '');

    if (emergencyCheck.isEmergency || mentalHealthCheck.isCrisis) {
      navigation.navigate('Recommendation', { 
        assessmentData: { symptoms: initialSymptom, answers: {} } 
      });
      return;
    }

    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const prompt = CLARIFYING_QUESTIONS_PROMPT.replace('{{symptoms}}', initialSymptom || '');
      const response = await getGeminiResponse(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
           setQuestions(parsed.questions);
        } else {
           throw new Error('Invalid response format');
        }
      } else {
        throw new Error('Failed to parse questions');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to generate assessment questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentQuestion = questions[currentStep];
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : '';
    const emergencyCheck = detectEmergency(currentAnswer);
    
    if (emergencyCheck.isEmergency) {
        console.log("Emergency detected during assessment:", emergencyCheck.matchedKeywords);
        const partialData = {
            symptoms: initialSymptom,
            answers: { ...answers, [currentQuestion?.id || 'last']: currentAnswer }
        };
        navigation.navigate('Recommendation', { assessmentData: partialData });
        return;
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(curr => curr + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      finishAssessment();
    }
  };

  const finishAssessment = () => {
    const assessmentData = {
        symptoms: initialSymptom,
        answers: answers
    };
    navigation.navigate('Recommendation', { assessmentData });
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const currentQuestion = questions[currentStep];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : '';

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.loadingText}>Analyzing symptoms...</Text>
        <Text variant="bodySmall" style={styles.loadingSubtext}>Preparing your personalized assessment</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <Button title="Retry" onPress={fetchQuestions} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingBottom: 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View style={[styles.reportCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.reportIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="chat-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.reportContent}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>YOUR INITIAL REPORT</Text>
              <Text variant="bodyMedium" style={styles.reportText}>{initialSymptom || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                  <Text variant="titleSmall" style={[styles.progressTitle, { color: theme.colors.onSurface }]}>Progress</Text>
                  <Text variant="labelMedium" style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                      Step {currentStep + 1} of {questions.length}
                  </Text>
              </View>
              <ProgressBar 
                  progress={questions.length > 0 ? (currentStep + 1) / questions.length : 0} 
                  color={theme.colors.primary} 
                  style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]} 
              />
          </View>

          {currentQuestion && (
            <>
              <Text variant="titleLarge" style={styles.questionText}>
                  {currentQuestion.text}
              </Text>
              
              <Card mode="outlined" style={styles.card}>
                  <Card.Content style={styles.cardContent}>
                  <View style={styles.answerContainer}>
                      {currentQuestion.type === 'choice' && currentQuestion.options ? (
                          <RadioButton.Group 
                              onValueChange={val => setAnswers(prev => ({...prev, [currentQuestion.id]: val}))} 
                              value={currentAnswer}
                          >
                              {currentQuestion.options.map(opt => (
                                  <View key={opt} style={styles.radioItem}>
                                    <RadioButton.Item 
                                        label={opt} 
                                        value={opt} 
                                        mode="android"
                                        labelStyle={styles.radioLabel}
                                        style={styles.radioInner}
                                        color={theme.colors.primary}
                                    />
                                  </View>
                              ))}
                          </RadioButton.Group>
                      ) : (
                          <TextInput
                              mode="outlined"
                              value={currentAnswer}
                              onChangeText={txt => setAnswers(prev => ({...prev, [currentQuestion.id]: txt}))}
                              onFocus={handleInputFocus}
                              placeholder="Describe your symptoms in detail..."
                              multiline
                              numberOfLines={4}
                              style={styles.textInput}
                              outlineStyle={{ borderRadius: 12, borderWidth: 1.5 }}
                              activeOutlineColor={theme.colors.primary}
                          />
                      )}
                  </View>

                  {currentQuestion.type === 'choice' ? (
                      <Button 
                          variant="primary"
                          title={currentStep === questions.length - 1 ? 'Finish Assessment' : 'Next Question'} 
                          onPress={handleNext} 
                          style={styles.fullButton}
                          disabled={!currentAnswer}
                      />
                  ) : (
                      <View style={styles.actionRow}>
                          <View style={styles.voiceActions}>
                            {isProcessingAudio ? (
                              <View style={styles.processingRow}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                              </View>
                            ) : (
                              <View style={styles.micButtonRow}>
                                <View style={styles.micButtonContainer}>
                                  {isRecording && (
                                    <Animated.View
                                      style={[styles.recordingPulse, { opacity: fadeAnim, backgroundColor: theme.colors.error }]}
                                    />
                                  )}
                                  <IconButton
                                    icon={isRecording ? 'stop' : 'microphone'}
                                    mode="contained"
                                    containerColor={isRecording ? theme.colors.error : theme.colors.primaryContainer}
                                    iconColor={isRecording ? theme.colors.onError : theme.colors.onPrimaryContainer}
                                    size={24}
                                    onPress={isRecording ? stopRecording : startRecording}
                                    accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                                  />
                                </View>
                              </View>
                            )}
                          </View>

                          <Button 
                              variant="primary"
                              title={currentStep === questions.length - 1 ? 'Finish Assessment' : 'Next Question'} 
                              onPress={handleNext} 
                              style={styles.inlineSubmitButton}
                              labelStyle={{ fontSize: 14 }}
                              contentStyle={styles.inlineSubmitContent}
                              disabled={!currentAnswer || isRecording || isProcessingAudio}
                          />
                      </View>
                  )}
                  </Card.Content>
              </Card>
            </>
          )}

          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <Button 
                variant="outline"
                title="Previous"
                onPress={handleBack}
                style={styles.flexButton}
                icon="arrow-left"
              />
            )}
          </View>
          
          {currentStep === 0 && (
            <View style={styles.navigationActions}>
                <Button 
                    mode="text" 
                    title="Cancel & Start Over"
                    onPress={handleBack} 
                    icon="close"
                    variant="outline"
                    style={styles.cancelButton}
                    labelStyle={{ color: theme.colors.error }}
                />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontWeight: 'bold' },
  loadingSubtext: { marginTop: 4, opacity: 0.7 },
  content: { padding: 16 },
  
  reportCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.1)',
    marginBottom: 24,
    alignItems: 'center',
  },
  reportIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportContent: { flex: 1 },
  reportText: { fontWeight: '500', marginTop: 2 },

  progressSection: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressTitle: { fontWeight: '700' },
  progressText: { marginBottom: 0 },
  progressBar: { height: 8, borderRadius: 4 },

  card: { padding: 0, marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  cardContent: { padding: 12 },
  questionText: { marginBottom: 16, fontWeight: '700', lineHeight: 28 },
  answerContainer: { marginBottom: 8 },
  radioItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  radioInner: { paddingVertical: 4 },
  radioLabel: { fontSize: 16 },
  textInput: { backgroundColor: 'transparent', marginBottom: 4 },
  
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 12,
  },
  voiceActions: { 
    flex: 0.15,
    justifyContent: 'center',
  },
  inlineSubmitButton: { 
    flex: 0.85,
    borderRadius: 12,
    marginLeft: 8,
  },
  inlineSubmitContent: {
    height: 44,
  },
  processingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  micButtonRow: { flexDirection: 'row', alignItems: 'center' },
  micButtonContainer: { position: 'relative', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recordingPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'absolute',
    opacity: 0.3,
  },

  buttonContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  flexButton: { flex: 1 },
  fullButton: { borderRadius: 12, height: 48, justifyContent: 'center' },
  
  navigationActions: { alignItems: 'center' },
  cancelButton: { borderColor: 'transparent' },
});

export default SymptomAssessmentScreen;