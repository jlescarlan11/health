import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, RadioButton, TextInput, ProgressBar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CheckStackScreenProps } from '../types/navigation';
import { getGeminiResponse } from '../services/gemini';
import { CLARIFYING_QUESTIONS_PROMPT } from '../constants/prompts';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';

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

  // Header height for KeyboardAvoidingView offset
  const headerHeight = 60;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight + insets.top : 0;

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
    } else {
      finishAssessment();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    } else {
        navigation.goBack();
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing symptoms...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text>
        <Button mode="contained" onPress={fetchQuestions}>Retry</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.header}>
              <Text variant="labelLarge" style={[styles.label, { color: theme.colors.primary }]}>Initial Assessment</Text>
              <Text variant="bodyMedium" style={[styles.symptomText, { color: theme.colors.onSurfaceVariant }]}>"{initialSymptom}"</Text>
          </View>

          <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                  <Text variant="titleSmall" style={[styles.progressTitle, { color: theme.colors.onSurface }]}>Progress</Text>
                  <Text variant="labelMedium" style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                      Step {currentStep + 1} of {questions.length}
                  </Text>
              </View>
              <ProgressBar 
                  progress={(currentStep + 1) / questions.length} 
                  color={theme.colors.primary} 
                  style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]} 
              />
          </View>

          {currentQuestion && (
              <Card mode="outlined" style={styles.card}>
                  <Card.Content>
                      <Text variant="headlineSmall" style={styles.questionText}>
                          {currentQuestion.text}
                      </Text>
                      
                      <View style={styles.answerContainer}>
                          {currentQuestion.type === 'choice' && currentQuestion.options ? (
                              <RadioButton.Group 
                                  onValueChange={val => setAnswers(prev => ({...prev, [currentQuestion.id]: val}))} 
                                  value={currentAnswer}
                              >
                                  {currentQuestion.options.map(opt => (
                                      <RadioButton.Item 
                                          key={opt} 
                                          label={opt} 
                                          value={opt} 
                                          mode="android"
                                          labelStyle={styles.radioLabel}
                                      />
                                  ))}
                              </RadioButton.Group>
                          ) : (
                              <TextInput
                                  mode="outlined"
                                  value={currentAnswer}
                                  onChangeText={txt => setAnswers(prev => ({...prev, [currentQuestion.id]: txt}))}
                                  onFocus={handleInputFocus}
                                  placeholder="Type your answer here..."
                                  multiline
                                  numberOfLines={3}
                                  style={[styles.textInput, { backgroundColor: theme.colors.surface }]}
                              />
                          )}
                      </View>

                      <Button 
                          mode="contained" 
                          onPress={handleNext} 
                          style={styles.nextButton}
                          disabled={!currentAnswer}
                          icon={currentStep === questions.length - 1 ? 'check' : 'chevron-right'}
                      >
                          {currentStep === questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                      </Button>
                  </Card.Content>
              </Card>
          )}
          
          <View style={styles.navigationActions}>
              <Button 
                  mode="text" 
                  onPress={handleBack} 
                  icon="arrow-left"
                  textColor={theme.colors.onSurfaceVariant}
              >
                  {currentStep === 0 ? 'Start Over' : 'Go Back'}
              </Button>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  content: { padding: 16, paddingVertical: 24 },
  
  header: { marginBottom: 32, paddingHorizontal: 4 },
  label: { fontWeight: 'bold', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
  symptomText: { fontSize: 16, fontStyle: 'italic', lineHeight: 22 },

  progressSection: { marginBottom: 32 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressTitle: { fontWeight: 'bold' },
  progressText: { marginBottom: 0 },
  progressBar: { height: 10, borderRadius: 5 },

  card: { borderRadius: 16, marginBottom: 24, paddingVertical: 8 },
  questionText: { marginBottom: 24, fontWeight: '700', lineHeight: 32 },
  answerContainer: { marginBottom: 8 },
  radioLabel: { fontSize: 16 },
  textInput: { minHeight: 100, marginBottom: 8 },
  
  nextButton: { marginTop: 16, borderRadius: 12, paddingVertical: 4 },
  
  navigationActions: { alignItems: 'center', marginTop: 8 },
});

export default SymptomAssessmentScreen;