import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, RadioButton, TextInput, ProgressBar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { getGeminiResponse } from '../services/gemini';
import { CLARIFYING_QUESTIONS_PROMPT } from '../constants/prompts';

type ScreenRouteProp = RouteProp<RootStackParamList, 'SymptomAssessment'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'SymptomAssessment'>;

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
  const { initialSymptom } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const prompt = CLARIFYING_QUESTIONS_PROMPT.replace('{{symptoms}}', initialSymptom);
      const response = await getGeminiResponse(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
           setQuestions(parsed.questions);
        } else {
           // Fallback if no questions array found (AI sometimes hallucinates format)
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
      navigation.goBack();
    }
  };

  const finishAssessment = () => {
    const assessmentData = {
        symptoms: initialSymptom,
        answers: answers
    };
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SymptomAssessmentScreen.tsx:78', message: 'finishAssessment entry', data: { targetScreen: 'Recommendation', assessmentDataKeys: Object.keys(assessmentData), navigationType: typeof navigation, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'H1' } }) }).catch(() => {});
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SymptomAssessmentScreen.tsx:83', message: 'Before navigation.navigate', data: { targetScreen: 'Recommendation', hasParams: !!assessmentData, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'H1' } }) }).catch(() => {});
    // #endregion
    navigation.navigate('Recommendation', { assessmentData });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SymptomAssessmentScreen.tsx:84', message: 'After navigation.navigate', data: { targetScreen: 'Recommendation', timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'H1' } }) }).catch(() => {});
    // #endregion
  };

  const currentQuestion = questions[currentStep];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : '';

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Analyzing symptoms...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <Button onPress={fetchQuestions} style={{ marginTop: 16 }}>Retry</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="titleLarge">Assessment</Text>
        <ProgressBar progress={(currentStep + 1) / questions.length} style={styles.progressBar} />
        <Text variant="bodySmall" style={styles.progressText}>Question {currentStep + 1} of {questions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentQuestion && (
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="headlineSmall" style={styles.questionText}>{currentQuestion.text}</Text>
                    
                    {currentQuestion.type === 'choice' && currentQuestion.options ? (
                        <RadioButton.Group onValueChange={val => setAnswers(prev => ({...prev, [currentQuestion.id]: val}))} value={currentAnswer}>
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
                            style={{ backgroundColor: 'white' }}
                        />
                    )}
                </Card.Content>
            </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
          <Button mode="outlined" onPress={handleBack} style={styles.navButton}>Back</Button>
          <Button 
            mode="contained" 
            onPress={handleNext} 
            style={styles.navButton}
            disabled={!currentAnswer}
          >
            {currentStep === questions.length - 1 ? 'Finish' : 'Next'}
          </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16 },
  header: { padding: 16, backgroundColor: 'white' },
  progressBar: { marginVertical: 8, height: 8, borderRadius: 4 },
  progressText: { textAlign: 'right', color: '#666' },
  content: { padding: 16 },
  card: { padding: 8, borderRadius: 12 },
  questionText: { marginBottom: 16 },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  navButton: { flex: 1, marginHorizontal: 8 },
});

export default SymptomAssessmentScreen;