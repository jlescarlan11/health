import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, useTheme, IconButton, TextInput, Card, Chip } from 'react-native-paper';
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

interface Message {
  id: string;
  text: string;
  sender: 'assistant' | 'user';
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
  const [messages, setMessages] = useState<Message[]>([]);

  // Voice Input State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputText, setInputText] = useState('');

  // Animation for recording indicator
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Header height for KeyboardAvoidingView offset
  const headerHeight = 60;
  const keyboardVerticalOffset = headerHeight + insets.top;

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
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
        setInputText(prev => prev + (prev ? ' ' : '') + simulatedText);
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
    Alert.alert(
      'Cancel Assessment',
      'Are you sure you want to start over? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Over', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  }, [navigation]);

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
    // Initial messages
    const initialMessages: Message[] = [
      { id: 'report', text: `YOUR INITIAL REPORT:\n${initialSymptom || 'Not specified'}`, sender: 'assistant' }
    ];
    setMessages(initialMessages);

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
           // Add first question to messages
           if (parsed.questions.length > 0) {
             setMessages(prev => [...prev, {
               id: parsed.questions[0].id,
               text: parsed.questions[0].text,
               sender: 'assistant'
             }]);
           }
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

  const handleNext = (answerText?: string) => {
    const finalAnswer = answerText || inputText;
    if (!finalAnswer.trim()) return;

    const currentQuestion = questions[currentStep];
    if (!currentQuestion) return;

    // Save answer
    const newAnswers = { ...answers, [currentQuestion.id]: finalAnswer };
    setAnswers(newAnswers);
    
    // Add user message
    const userMsg: Message = { id: `user-${currentStep}`, text: finalAnswer, sender: 'user' };
    
    // Check for emergency
    const emergencyCheck = detectEmergency(finalAnswer);
    if (emergencyCheck.isEmergency) {
        console.log("Emergency detected during assessment:", emergencyCheck.matchedKeywords);
        const partialData = {
            symptoms: initialSymptom,
            answers: newAnswers
        };
        setMessages(prev => [...prev, userMsg]);
        navigation.navigate('Recommendation', { assessmentData: partialData });
        return;
    }

    // Move to next step or finish
    if (currentStep < questions.length - 1) {
      const nextStep = currentStep + 1;
      const nextQuestion = questions[nextStep];
      const assistantMsg: Message = { id: nextQuestion.id, text: nextQuestion.text, sender: 'assistant' };
      
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setCurrentStep(nextStep);
      setInputText('');
      
      // Scroll to end
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setMessages(prev => [...prev, userMsg]);
      finishAssessment(newAnswers);
    }
  };

  const finishAssessment = (finalAnswers: Record<string, string>) => {
    const assessmentData = {
        symptoms: initialSymptom,
        answers: finalAnswers
    };
    navigation.navigate('Recommendation', { assessmentData });
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const currentQuestion = questions[currentStep];

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

  const renderMessage = (message: Message) => {
    const isAssistant = message.sender === 'assistant';
    return (
      <View key={message.id} style={[
        styles.messageWrapper,
        isAssistant ? styles.assistantWrapper : styles.userWrapper
      ]}>
        {isAssistant && (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="robot" size={18} color={theme.colors.primary} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isAssistant ? 
            [styles.assistantBubble, { backgroundColor: theme.colors.surface }] : 
            [styles.userBubble, { backgroundColor: theme.colors.primary }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isAssistant ? theme.colors.onSurface : theme.colors.onPrimary }
          ]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardVisible && { paddingBottom: 60 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.messagesContainer}>
            {messages.map(renderMessage)}
          </View>
        </ScrollView>

        <View style={[styles.inputSection, { backgroundColor: theme.colors.surface }]}>
          {questions.length > 0 && (
            <View style={styles.progressSubtle}>
               <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                  Question {currentStep + 1} of {questions.length}
               </Text>
            </View>
          )}

          {currentQuestion?.type === 'choice' && currentQuestion.options && (
            <View style={styles.choiceContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScrollContent}>
                {currentQuestion.options.map((opt) => (
                  <Chip
                    key={opt}
                    onPress={() => handleNext(opt)}
                    style={styles.choiceChip}
                    mode="flat"
                    compact
                    showSelectedOverlay
                  >
                    {opt}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          <Card mode="outlined" style={[styles.inputCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.inputRow}>
              <TextInput
                mode="flat"
                placeholder="Type your answer..."
                multiline
                numberOfLines={1}
                value={inputText}
                onChangeText={setInputText}
                onFocus={handleInputFocus}
                style={[styles.textInput, { backgroundColor: 'transparent' }]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                dense
              />

              <View style={styles.actionIcons}>
                {isProcessingAudio ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={styles.iconMargin} />
                ) : (
                  <View style={styles.micContainer}>
                    {isRecording && (
                      <Animated.View
                        style={[styles.recordingPulse, { opacity: fadeAnim, backgroundColor: theme.colors.error }]}
                      />
                    )}
                    <IconButton
                      icon={isRecording ? 'stop' : 'microphone'}
                      size={24}
                      iconColor={isRecording ? theme.colors.error : theme.colors.onSurfaceVariant}
                      onPress={isRecording ? stopRecording : startRecording}
                      style={styles.iconButton}
                    />
                  </View>
                )}
                
                <IconButton
                  icon={currentStep === questions.length - 1 ? 'check-circle' : 'send'}
                  size={24}
                  iconColor={inputText.trim() ? theme.colors.primary : theme.colors.outline}
                  disabled={!inputText.trim() || isRecording || isProcessingAudio}
                  onPress={() => handleNext()}
                  style={styles.iconButton}
                />
              </View>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontWeight: 'bold' },
  loadingSubtext: { marginTop: 4, opacity: 0.7 },
  
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16 },
  messagesContainer: { flex: 1 },
  
  messageWrapper: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  userWrapper: { justifyContent: 'flex-end' },
  
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 16, lineHeight: 22 },

  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  progressSubtle: {
    alignItems: 'center',
    marginBottom: 10,
  },
  choiceContainer: {
    marginBottom: 12,
  },
  choiceScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  choiceChip: {
    height: 36,
  },
  inputCard: { 
    borderRadius: 28, 
    overflow: 'hidden', 
    borderWidth: 1,
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 4,
  },
  textInput: { 
    flex: 1, 
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 12,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  micContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconButton: { margin: 0 },
  iconMargin: { marginHorizontal: 8 },
  recordingPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: 'absolute',
    opacity: 0.3,
  },
});



export default SymptomAssessmentScreen;