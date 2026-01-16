import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  LayoutAnimation,
  UIManager,
  Keyboard,
  Animated,
  BackHandler,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { speechService } from '../services/speechService';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import { getGeminiResponse } from '../services/gemini';
import { CLARIFYING_QUESTIONS_PROMPT } from '../constants/prompts';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { setHighRisk } from '../store/navigationSlice';
import { TriageEngine } from '../services/triageEngine';
import { TriageFlow, TriageNode } from '../types/triage';

const triageFlow = require('../../assets/triage-flow.json') as TriageFlow;

// Import common components
import StandardHeader from '../components/common/StandardHeader';
import { Button } from '../components/common/Button';
import { InputCard, TypingIndicator, InputCardRef, SafetyRecheckModal, ProgressBar } from '../components/common';

type ScreenRouteProp = RootStackScreenProps<'SymptomAssessment'>['route'];
type NavigationProp = RootStackScreenProps<'SymptomAssessment'>['navigation'];

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
  isOffline?: boolean;
}

const SymptomAssessmentScreen = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputCardRef = useRef<InputCardRef>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const { initialSymptom } = route.params || { initialSymptom: '' };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalEstimatedSteps, setTotalEstimatedSteps] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [inputText, setInputText] = useState('');
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

  // Offline Mode State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentOfflineNodeId, setCurrentOfflineNodeId] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: e.duration || 250,
          useNativeDriver: false,
        }).start();
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: e.duration || 250,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      speechService.destroy();
    };
  }, []);

  const startRecording = async () => {
    if (!speechService.isAvailable) {
      Alert.alert(
        'Voice Unavailable',
        'Voice recognition is not available on this device/simulator. Please type your answer.',
      );
      return;
    }

    try {
      setIsRecording(true);
      setVolume(0);
      await speechService.startListening(
        (text) => {
          setInputText(text);
        },
        (error) => {
          console.error('STT Error:', error);
          setIsRecording(false);
          setVolume(0);
          Alert.alert('Speech Error', error.message || 'Could not recognize speech. Please try again.');
        },
        (vol) => {
          setVolume(vol);
        },
      );
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
      setVolume(0);
      Alert.alert('Error', 'Failed to start voice recognition.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setVolume(0);
    try {
      await speechService.stopListening();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const handleBack = useCallback(() => {
    if (isOfflineMode) {
      Alert.alert(
        'Cancel Assessment',
        'Are you sure you want to stop the offline check?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }

    if (currentStep === 0 && messages.length <= 1) {
      Alert.alert(
        'Cancel Assessment',
        'Are you sure you want to start over? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Over', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }

    // Smooth transition for message removal
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Cancel any pending typing response
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);

    // Determine if we are currently "between" steps (user answered, but assistant hasn't yet)
    // The conversation structure is: 1 (intro) + 2*currentStep messages
    // If messages.length > 2*currentStep + 1, it means the user just answered
    const isMidStep = messages.length > 2 * currentStep + 1;

    let targetStep = currentStep;
    if (!isMidStep) {
      targetStep = currentStep - 1;
    }

    const questionToUndo = questions[targetStep];

    // Synchronized state updates
    // 1. Truncate messages to the state BEFORE the user answered the target question
    setMessages((prev) => prev.slice(0, 2 * targetStep + 1));

    // 2. Remove the answer from state
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      if (questionToUndo) {
        delete newAnswers[questionToUndo.id];
      }
      return newAnswers;
    });

    // 3. Revert step
    setCurrentStep(targetStep);

    // 4. Restore previous answer to input for easy editing
    const previousAnswer = answers[questionToUndo?.id];
    if (previousAnswer && previousAnswer !== 'User was not sure') {
      setInputText(previousAnswer);
    } else {
      setInputText('');
    }

    setTimeout(() => {
      inputCardRef.current?.focus();
    }, 100);
  }, [currentStep, messages, questions, answers, navigation, isOfflineMode, totalEstimatedSteps]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true; // Prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [handleBack]),
  );

  useEffect(() => {
    navigation.setOptions({
      header: () => <StandardHeader title="Assessment" showBackButton onBackPress={handleBack} />,
    });
  }, [navigation, handleBack]);

  useEffect(() => {
    // Check for immediate escalation
    const emergencyCheck = detectEmergency(initialSymptom || '');
    const mentalHealthCheck = detectMentalHealthCrisis(initialSymptom || '');

    if (emergencyCheck.isEmergency || mentalHealthCheck.isCrisis) {
      dispatch(setHighRisk(true));
      navigation.replace('Recommendation', {
        assessmentData: { symptoms: initialSymptom || '', answers: {} },
      });
      return;
    }

    fetchQuestions();
  }, []);

  const startOfflineTriage = () => {
    setIsOfflineMode(true);
    setIsNetworkError(false);
    const startNode = TriageEngine.getStartNode(triageFlow);
    setCurrentOfflineNodeId(startNode.id);
    
    // Estimate offline steps - this is a rough approximation based on typical flow depth
    setTotalEstimatedSteps(5);
    
    setMessages([
      {
        id: 'offline-intro',
        text: "I'm having trouble connecting to the AI assistant. I've switched to the Offline Emergency Check to help you identify any critical red flags immediately.",
        sender: 'assistant',
        isOffline: true,
      },
      {
        id: startNode.id,
        text: startNode.text || '',
        sender: 'assistant',
        isOffline: true,
      }
    ]);
    
    setLoading(false);
    setError('');
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      setIsNetworkError(false);

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('NETWORK_ERROR');
      }

      const prompt = CLARIFYING_QUESTIONS_PROMPT.replace('{{symptoms}}', initialSymptom || '');
      const response = await getGeminiResponse(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          setQuestions(parsed.questions);
          setTotalEstimatedSteps(parsed.questions.length);
          // Add combined first message to conversation
          if (parsed.questions.length > 0) {
            const firstQ = parsed.questions[0];
            const combinedText = `I've noted your report of "${initialSymptom}". To help me provide the best guidance, I'd like to ask a few clarifying questions.\n\n${firstQ.text}`;

            setMessages([
              {
                id: 'intro',
                text: combinedText,
                sender: 'assistant',
              },
            ]);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error('Failed to parse questions');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'NETWORK_ERROR' || err.message?.includes('network') || err.message?.includes('fetch')) {
        setIsNetworkError(true);
        setError('Connection lost. We can continue with an emergency-focused check while offline.');
      } else {
        setError('Unable to generate assessment questions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineNext = (answer: string) => {
    if (!currentOfflineNodeId || isTyping) return;

    // Add user message
    const userMsg: Message = {
      id: `user-offline-${Date.now()}`,
      text: answer,
      sender: 'user',
      isOffline: true,
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);

    setTimeout(() => {
      try {
        const result = TriageEngine.processStep(triageFlow, currentOfflineNodeId, answer);
        
        if (result.isOutcome) {
          const rec = result.node.recommendation!;
          // Navigate to recommendation with offline data
          navigation.replace('Recommendation', {
            assessmentData: {
              symptoms: initialSymptom || '',
              answers: { 'Offline Triage': rec.reasoning },
              offlineRecommendation: rec,
            },
          });
        } else {
          const nextNode = result.node;
          const assistantMsg: Message = {
            id: nextNode.id,
            text: nextNode.text || '',
            sender: 'assistant',
            isOffline: true,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setCurrentOfflineNodeId(nextNode.id);
          setCurrentStep((prev) => Math.min(prev + 1, totalEstimatedSteps - 1));
        }
      } catch (err) {
        console.error('Offline triage error:', err);
        setError('An error occurred during the offline check.');
      } finally {
        setIsTyping(false);
      }
    }, 800);
  };

  const handleNext = (answerText?: string, isSkip: boolean = false) => {
    if (isOfflineMode) {
      handleOfflineNext(answerText || '');
      return;
    }

    const finalAnswer = isSkip ? 'User was not sure' : answerText || inputText;
    const displayAnswer = isSkip ? "I'm not sure" : finalAnswer;

    if (!finalAnswer.trim() || isTyping) return;

    const currentQuestion = questions[currentStep];
    if (!currentQuestion) return;

    // Save answer
    const newAnswers = { ...answers, [currentQuestion.id]: finalAnswer };
    setAnswers(newAnswers);

    // Add user message
    const userMsg: Message = {
      id: `user-${currentStep}-${Date.now()}`,
      text: displayAnswer,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Check for emergency
    const emergencyCheck = detectEmergency(finalAnswer);
    if (emergencyCheck.isEmergency) {
      dispatch(setHighRisk(true));
      const partialData = {
        symptoms: initialSymptom || '',
        answers: newAnswers,
      };
      navigation.replace('Recommendation', { assessmentData: partialData });
      return;
    }

    // Move to next step or finish with a thoughtful delay
    setIsTyping(true);

    const delay = 1500; // 1.5 seconds delay for a more natural feel

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      if (currentStep < questions.length - 1) {
        const nextStep = currentStep + 1;
        const nextQuestion = questions[nextStep];

        // Random acknowledgments for a more conversational feel
        const acknowledgments = [
          'I understand.',
          'Thank you for that information.',
          'Got it, thanks.',
          "I see. That's helpful to know.",
          'Okay, thank you for clarifying.',
        ];
        const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

        const assistantMsg: Message = {
          id: nextQuestion.id,
          text: `${ack}\n\n${nextQuestion.text}`,
          sender: 'assistant',
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        setCurrentStep(nextStep);

        // Scroll to end
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setIsTyping(false);
        setCurrentStep(questions.length); // Final step
        finishAssessment(newAnswers);
      }
    }, delay);
  };

  const finishAssessment = (finalAnswers: Record<string, string>) => {
    const assessmentData = {
      symptoms: initialSymptom || '',
      answers: finalAnswers,
    };
    navigation.replace('Recommendation', { assessmentData });
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const currentQuestion = questions[currentStep];
  const currentOfflineNode = currentOfflineNodeId ? triageFlow.nodes[currentOfflineNodeId] : null;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.loadingText}>
          Analyzing symptoms...
        </Text>
        <Text variant="bodySmall" style={styles.loadingSubtext}>
          Preparing your personalized assessment
        </Text>
      </View>
    );
  }

  if (error && !isNetworkError) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <Button title="Retry" onPress={fetchQuestions} />
      </View>
    );
  }

  const renderTypingIndicator = () => {
    return (
      <View style={[styles.messageWrapper, styles.assistantWrapper]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="robot" size={18} color={theme.colors.primary} />
        </View>
        <View
          style={[
            styles.bubble,
            styles.assistantBubble,
            { backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 12 },
          ]}
        >
          <TypingIndicator />
        </View>
      </View>
    );
  };

  const renderMessage = (message: Message) => {
    const isAssistant = message.sender === 'assistant';
    return (
      <View
        key={message.id}
        style={[styles.messageWrapper, isAssistant ? styles.assistantWrapper : styles.userWrapper]}
      >
        {isAssistant && (
          <View style={[styles.avatar, { backgroundColor: message.isOffline ? theme.colors.secondaryContainer : theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons 
              name={message.isOffline ? "shield-check" : "robot"} 
              size={18} 
              color={message.isOffline ? theme.colors.secondary : theme.colors.primary} 
            />
          </View>
        )}
        <View
          style={[
            isAssistant
              ? [styles.bubble, styles.assistantBubble, { backgroundColor: theme.colors.surface }]
              : [styles.bubble, styles.userBubble, { backgroundColor: theme.colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isAssistant ? theme.colors.onSurface : theme.colors.onPrimary },
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <ProgressBar 
          progress={totalEstimatedSteps > 0 ? (currentStep) / totalEstimatedSteps : 0} 
          label={isOfflineMode ? "Offline Check Progress" : "Assessment Progress"}
          showPercentage
          height={6}
        />
      </View>
      {isOfflineMode && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.colors.secondaryContainer }]}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.secondary} />
          <Text style={[styles.offlineBannerText, { color: theme.colors.onSecondaryContainer }]}>
            OFFLINE EMERGENCY CHECK ACTIVE
          </Text>
        </View>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.messagesContainer}>
          {messages.map(renderMessage)}
          {isTyping && renderTypingIndicator()}
          
          {isNetworkError && (
            <View style={[styles.errorCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.error} style={styles.errorIcon} />
              <Text variant="titleMedium" style={{ color: theme.colors.error, fontWeight: 'bold' }}>Connection Issue</Text>
              <Text style={styles.errorDescription}>{error}</Text>
              <View style={styles.errorActions}>
                <Button 
                  title="START OFFLINE CHECK" 
                  onPress={startOfflineTriage}
                  variant="primary"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button 
                  title="RETRY" 
                  onPress={fetchQuestions}
                  variant="outline"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.inputSection,
          {
            paddingBottom: Math.max(12, insets.bottom),
            paddingLeft: Math.max(16, insets.left),
            paddingRight: Math.max(16, insets.right),
            backgroundColor: theme.colors.background,
            marginBottom: Animated.add(keyboardHeight, new Animated.Value(8)),
          },
        ]}
      >
        {!isOfflineMode && currentQuestion && (
          <View style={styles.choiceContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.choiceScrollContent}
            >
              {currentQuestion.type === 'choice' &&
                currentQuestion.options?.map((opt) => (
                  <Chip
                    key={opt}
                    onPress={() => !isTyping && handleNext(opt)}
                    style={styles.choiceChip}
                    mode="flat"
                    compact
                    showSelectedOverlay
                    disabled={isTyping}
                  >
                    {opt}
                  </Chip>
                ))}
              <Chip
                onPress={() => !isTyping && handleNext(undefined, true)}
                style={[styles.choiceChip, { borderColor: theme.colors.outline }]}
                textStyle={{ color: theme.colors.onSurfaceVariant }}
                mode="outlined"
                compact
                disabled={isTyping}
              >
                I'm not sure
              </Chip>
            </ScrollView>
          </View>
        )}

        {isOfflineMode && currentOfflineNode && currentOfflineNode.type === 'question' && (
          <View style={styles.choiceContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.choiceScrollContent}
            >
              {currentOfflineNode.options?.map((opt) => (
                <Chip
                  key={opt.label}
                  onPress={() => !isTyping && handleOfflineNext(opt.label)}
                  style={[styles.choiceChip, { minWidth: 80 }]}
                  mode="flat"
                  compact
                  showSelectedOverlay
                  disabled={isTyping}
                >
                  {opt.label}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        <InputCard
          ref={inputCardRef}
          value={inputText}
          onChangeText={setInputText}
          onSubmit={() => handleNext()}
          label={isOfflineMode ? "Please use options above" : "Type your answer..."}
          placeholder=""
          onFocus={handleInputFocus}
          isRecording={isRecording}
          volume={volume}
          isProcessingAudio={isProcessingAudio}
          onVoicePress={isRecording ? stopRecording : startRecording}
          disabled={isTyping || isOfflineMode}
        />
      </Animated.View>

      <SafetyRecheckModal
        visible={safetyModalVisible}
        onDismiss={() => setSafetyModalVisible(false)}
      />
    </View>
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
    paddingTop: 10,
    paddingBottom: 10,
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  errorCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorDescription: {
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    width: '100%',
  },
});

export default SymptomAssessmentScreen;

