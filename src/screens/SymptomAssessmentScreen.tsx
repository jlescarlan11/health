import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { initialSymptom } = route.params || { initialSymptom: '' };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        // Optional: warn user before exiting? 
        // For now, we just go back to the previous screen (NavigatorHome)
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
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.initialSymptomContainer}>
            <Text variant="titleMedium" style={styles.label}>Initial Symptoms:</Text>
            <Text variant="bodyMedium" style={styles.symptomText}>{initialSymptom}</Text>
        </View>

        <View style={styles.progressContainer}>
            <Text variant="bodySmall" style={styles.progressText}>
                Question {currentStep + 1} of {questions.length}
            </Text>
            <ProgressBar 
                progress={(currentStep + 1) / questions.length} 
                color={theme.colors.primary} 
                style={styles.progressBar} 
            />
        </View>

        {currentQuestion && (
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="headlineSmall" style={styles.questionText}>
                        {currentQuestion.text}
                    </Text>
                    
                    {currentQuestion.type === 'choice' && currentQuestion.options ? (
                        <RadioButton.Group 
                            onValueChange={val => setAnswers(prev => ({...prev, [currentQuestion.id]: val}))} 
                            value={currentAnswer}
                        >
                            {currentQuestion.options.map(opt => (
                                <RadioButton.Item key={opt} label={opt} value={opt} />
                            ))}
                        </RadioButton.Group>
                    ) : (
                        <TextInput
                            mode="outlined"
                            value={currentAnswer}
                            onChangeText={txt => setAnswers(prev => ({...prev, [currentQuestion.id]: txt}))}
                            placeholder="Type your answer..."
                            multiline
                            style={styles.textInput}
                        />
                    )}

                    <Button 
                        mode="contained" 
                        onPress={handleNext} 
                        style={styles.nextButton}
                        disabled={!currentAnswer}
                    >
                        {currentStep === questions.length - 1 ? 'Finish Assessment' : 'Next'}
                    </Button>
                </Card.Content>
            </Card>
        )}
        
        <View style={styles.backButtonContainer}>
            <Button mode="text" onPress={handleBack} icon="arrow-left">
                {currentStep === 0 ? 'Back to Start' : 'Edit Previous Answer'}
            </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  content: { padding: 16 },
  
  initialSymptomContainer: { marginBottom: 20 },
  label: { fontWeight: 'bold', color: '#666', marginBottom: 4 },
  symptomText: { fontSize: 16 },

  progressContainer: { marginBottom: 16 },
  progressText: { textAlign: 'right', color: '#666', marginBottom: 4 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' },

  card: { borderRadius: 12, elevation: 4, marginBottom: 16 },
  questionText: { marginBottom: 24, fontWeight: '500' },
  textInput: { backgroundColor: 'white', minHeight: 80 },
  
  nextButton: { marginTop: 24 },
  
  backButtonContainer: { alignItems: 'center' },
});

export default SymptomAssessmentScreen;
