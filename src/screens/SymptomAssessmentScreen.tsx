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
import {
  generateAssessmentPlan,
  extractClinicalProfile,
} from '../services/gemini';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { setHighRisk } from '../store/navigationSlice';
import { TriageEngine } from '../services/triageEngine';
import { TriageFlow, AssessmentQuestion } from '../types/triage';

const triageFlow = require('../../assets/triage-flow.json') as TriageFlow;

import StandardHeader from '../components/common/StandardHeader';
import { Button } from '../components/common/Button';
import {
  InputCard,
  TypingIndicator,
  InputCardRef,
  SafetyRecheckModal,
  ProgressBar,
  MultiSelectChecklist,
} from '../components/common';

type ScreenRouteProp = RootStackScreenProps<'SymptomAssessment'>['route'];
type NavigationProp = RootStackScreenProps<'SymptomAssessment'>['navigation'];

interface Message {
  id: string;
  text: string;
  sender: 'assistant' | 'user';
  isOffline?: boolean;
}

const parseRedFlags = (text: string): { id: string, label: string }[] => {
  // 1. Try to find a list after a colon
  let content = text;
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    content = text.substring(colonIndex + 1);
  } else {
    // 2. Try to find a list after specific keywords if no colon
    const keywords = ["including", "like", "such as", "following", "these:"];
    for (const kw of keywords) {
      const idx = text.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        content = text.substring(idx + kw.length);
        break;
      }
    }
  }

  // Clean up content (remove trailing question mark)
  content = content.replace(/\?$/, '');

  // Split by comma or "or"
  // "A, B, or C" -> ["A", "B", "C"]
  const rawItems = content.split(/,| or /).map(s => s.trim()).filter(s => s.length > 0);
  
  // Deduplicate and format
  const uniqueItems = Array.from(new Set(rawItems));
  
  return uniqueItems.map(item => ({
    id: item, // Use label as ID for simplicity here
    label: item.charAt(0).toUpperCase() + item.slice(1)
  }));
};

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

  // Core State
  const [messages, setMessages] = useState<Message[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // Map question ID -> User Answer
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  
  // UI Interactions
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  
  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  // Reset checklist when question changes
  useEffect(() => {
    setSelectedRedFlags([]);
  }, [currentQuestionIndex]);


    // Offline
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [currentOfflineNodeId, setCurrentOfflineNodeId] = useState<string | null>(null);
  
    /**
     * Log conversation step for debugging
     */
    const logConversationStep = (
      step: number,
      question: string,
      userAnswer: string,
      emergencyCheck: any,
    ) => {
      console.log(`\n╔═══ CONVERSATION STEP ${step} ═══╗`);
      console.log(`║ Q: ${question}`);
      console.log(`║ A: ${userAnswer}`);
      console.log(`║ Emergency: ${emergencyCheck.isEmergency} (score: ${emergencyCheck.score})`);
      if (emergencyCheck.matchedKeywords?.length > 0) {
          console.log(`║ Keywords: ${emergencyCheck.matchedKeywords.join(', ')}`);
      }
      console.log(`╚${'═'.repeat(30)}╝\n`);
    };
  
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
        speechService.destroy();
      };
    }, []);
  
    // --- INITIALIZATION ---
    useEffect(() => {
      initializeAssessment();
    }, []);
  
    const initializeAssessment = async () => {
      // 1. Initial Emergency Check (Locally)
      const emergencyCheck = detectEmergency(initialSymptom || '', { isUserInput: true });
      const mentalHealthCheck = detectMentalHealthCrisis(initialSymptom || '');
  
      if (emergencyCheck.isEmergency || mentalHealthCheck.isCrisis) {
        console.log('[Assessment] IMMEDIATE ESCALATION - Emergency/Crisis detected in initial symptom');
        dispatch(setHighRisk(true));
        navigation.replace('Recommendation', {
          assessmentData: { symptoms: initialSymptom || '', answers: [] },
        });
        return;
      }
  
      // 2. Fetch Questions (Call #1)
      try {
        setLoading(true);
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) throw new Error('NETWORK_ERROR');
  
        const plan = await generateAssessmentPlan(initialSymptom || '');
        setQuestions(plan);
        
        // Add Intro & First Question
        const firstQ = plan[0];
        const introText = `I've noted your report of "${initialSymptom}". To help me provide the best guidance, I have a few questions.\n\n${firstQ.text}`;
        
        setMessages([
          { id: 'intro', text: introText, sender: 'assistant' }
        ]);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Initialization Error:', err);
        if (err.message === 'NETWORK_ERROR') {
           setError('Network unavailable. Switching to Offline Mode.');
           startOfflineTriage();
        } else {
           setError('Unable to start assessment. Please try again.');
           setLoading(false);
        }
      }
    };
  
    // --- INTERACTION LOGIC ---
    
    const handleNext = async (answerOverride?: string, isSkip: boolean = false) => {
      const answer = answerOverride || inputText;
      if ((!answer.trim() && !isSkip) || processing) return;
  
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ && !isOfflineMode) return;
  
      setProcessing(true);
      setInputText('');
  
      // 1. Append User Message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        text: isSkip ? "I'm not sure" : answer,
        sender: 'user',
        isOffline: isOfflineMode
      };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
  
      // 2. Emergency Check (Local, Deterministic)
      // Only check if it's NOT a skip
      if (!isSkip && !isOfflineMode) {
          const safetyCheck = detectEmergency(answer, { isUserInput: true });
          
          // Log the step
          logConversationStep(currentQuestionIndex, currentQ.text, answer, safetyCheck);
  
          if (safetyCheck.isEmergency) {
              dispatch(setHighRisk(true));
              console.log('[Assessment] EMERGENCY DETECTED during flow. Escalating.');
              navigation.replace('Recommendation', {
                  assessmentData: { 
                      symptoms: initialSymptom || '', 
                      answers: [...Object.entries(answers).map(([k,v]) => ({question: k, answer: v})), { question: currentQ.text, answer }],
                      extractedProfile: {
                          age: null,
                          duration: null,
                          severity: null,
                          progression: null,
                          red_flag_denials: null,
                          summary: `Emergency detected: ${safetyCheck.matchedKeywords.join(', ')}`
                      }
                  }
              });
              return;
          }
      }
  
      // 3. Store Answer
      if (!isOfflineMode) {
          const newAnswers = { ...answers, [currentQ.id]: isSkip ? "Skipped/Unknown" : answer };
          setAnswers(newAnswers);
  
          // 4. Progress or Finish
          if (currentQuestionIndex < questions.length - 1) {
              // Next Question
              setIsTyping(true);
              setTimeout(() => {
                  const nextIdx = currentQuestionIndex + 1;
                  const nextQ = questions[nextIdx];
                  setMessages(prev => [...prev, {
                      id: `ai-${nextIdx}`,
                      text: nextQ.text,
                      sender: 'assistant'
                  }]);
                  setCurrentQuestionIndex(nextIdx);
                  setIsTyping(false);
                  setProcessing(false);
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
              }, 600);
          } else {
              // FINISH -> Call #2 (Parsing)
              setIsTyping(true);
              await finalizeAssessment(newAnswers, nextHistory);
          }
      } else {
          // Offline Flow Handling
          handleOfflineLogic(answer);
      }
    };
  
    const finalizeAssessment = async (finalAnswers: Record<string, string>, currentHistory: Message[]) => {
      console.log('[Assessment] Finalizing... Extracting Slots.');
      
      // Construct history for the parser
      const history = currentHistory.map(m => ({
          role: m.sender, 
          text: m.text 
      }));
      // Add the last user answer which might just have been added to state but not fully flushed in a complex way (actually messages state is updated, so we good).
      
      try {
          const profile = await extractClinicalProfile(history);
          
          console.log('\n╔═══ FINAL PROFILE EXTRACTION ═══╗');
          console.log(JSON.stringify(profile, null, 2));
          console.log(`╚${'═'.repeat(32)}╝\n`);
  
          // Format for Recommendation Screen
          const formattedAnswers = questions.map(q => ({
              question: q.text,
              answer: finalAnswers[q.id] || "Not answered"
          }));
  
          navigation.replace('Recommendation', {
              assessmentData: {
                  symptoms: initialSymptom || '',
                  answers: formattedAnswers,
                  extractedProfile: profile
              }
          });
      } catch (e) {
          console.error('Finalization failed', e);
          Alert.alert("Error", "Could not process results. Please try again.");
          setProcessing(false);
          setIsTyping(false);
      }
    };
  // --- OFFLINE LOGIC ---
  const startOfflineTriage = () => {
    setIsOfflineMode(true);
    setError('');
    const startNode = TriageEngine.getStartNode(triageFlow);
    setCurrentOfflineNodeId(startNode.id);
    setMessages([
      {
        id: 'offline-intro',
        text: "I'm having trouble connecting to the AI. I've switched to Offline Emergency Check.",
        sender: 'assistant',
        isOffline: true,
      },
      {
        id: startNode.id,
        text: startNode.text || '',
        sender: 'assistant',
        isOffline: true
      },
    ]);
    setLoading(false);
  };

  const handleOfflineLogic = (answer: string) => {
      if (!currentOfflineNodeId) return;
      
      setIsTyping(true);
      setTimeout(() => {
        const result = TriageEngine.processStep(triageFlow, currentOfflineNodeId, answer);
        if (result.isOutcome) {
            navigation.replace('Recommendation', {
                assessmentData: {
                    symptoms: initialSymptom || '',
                    answers: [{ question: 'Offline Triage', answer: result.node.recommendation?.reasoning || 'Completed' }],
                    offlineRecommendation: result.node.recommendation
                }
            });
        } else {
            const nextNode = result.node;
            setMessages(prev => [...prev, {
                id: nextNode.id,
                text: nextNode.text || '',
                sender: 'assistant',
                isOffline: true
            }]);
            setCurrentOfflineNodeId(nextNode.id);
            setIsTyping(false);
            setProcessing(false);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }, 500);
  };

  // --- UTILS ---
  const handleBack = useCallback(() => {
    // If we go back, we pop the last Q&A pair (User Answer + Assistant Question)
    // But we need to distinguish between "User just answered" vs "Waiting for user" 
    
    if (messages.length <= 1) {
        navigation.goBack();
        return;
    }

    Alert.alert(
        "Restart Assessment?",
        "Going back will restart the assessment. Are you sure?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Restart", style: "destructive", onPress: () => navigation.goBack() }
        ]
    );
  }, [messages, navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleBack]),
  );
  
  // Voice Handlers
  const startRecording = async () => {
      if (!speechService.isAvailable) return Alert.alert("Not Available", "Voice input not supported.");
      try {
          setIsRecording(true);
          await speechService.startListening(
              (text) => setInputText(text),
              (err) => { console.error(err); setIsRecording(false); },
              (vol) => setVolume(vol)
          );
      } catch (e) { setIsRecording(false); }
  };
  const stopRecording = async () => {
      setIsRecording(false);
      await speechService.stopListening();
  };

  // --- RENDER ---
  const renderMessage = (msg: Message) => {
    const isAssistant = msg.sender === 'assistant';
    return (
      <View key={msg.id} style={[styles.messageWrapper, isAssistant ? styles.assistantWrapper : styles.userWrapper]}>
        {isAssistant && (
           <View style={[styles.avatar, { backgroundColor: msg.isOffline ? theme.colors.secondaryContainer : theme.colors.primaryContainer }]}>
             <MaterialCommunityIcons name={msg.isOffline ? "shield-check" : "robot"} size={18} color={msg.isOffline ? theme.colors.secondary : theme.colors.primary} />
           </View>
        )}
        <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble, { backgroundColor: isAssistant ? theme.colors.surface : theme.colors.primary }]}>
           <Text style={[styles.messageText, { color: isAssistant ? theme.colors.onSurface : theme.colors.onPrimary }]}>{msg.text}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Preparing your assessment...</Text>
      </View>
    );
  }

  // Determine current options if offline
  const currentQuestion = questions[currentQuestionIndex];
  const offlineOptions = (isOfflineMode && currentOfflineNodeId) 
    ? triageFlow.nodes[currentOfflineNodeId]?.options 
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader title="Assessment" showBackButton onBackPress={handleBack} />
      
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
         <ProgressBar 
            progress={isOfflineMode ? 0.5 : (currentQuestionIndex / (questions.length || 1))}
            label={isOfflineMode ? "Emergency Check" : "Assessment Progress"}
         />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(renderMessage)}
        {isTyping && (
             <View style={[styles.messageWrapper, styles.assistantWrapper]}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="robot" size={18} color={theme.colors.primary} />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: theme.colors.surface, padding: 12 }]}>
                  <TypingIndicator />
                </View>
             </View>
        )}
      </ScrollView>

      <Animated.View style={[
        styles.inputSection, 
        { 
          marginBottom: keyboardHeight, 
          backgroundColor: theme.colors.background,
          paddingBottom: Math.max(insets.bottom, 16) + 8 
        }
      ]}>
         {/* Red Flags Checklist - Custom UI */}
         {!isOfflineMode && currentQuestion?.id === 'red_flags' ? (
           <View style={{ paddingBottom: 8 }}>
             <MultiSelectChecklist
               options={parseRedFlags(currentQuestion.text)}
               selectedIds={selectedRedFlags}
               onSelectionChange={setSelectedRedFlags}
               title="SELECT ALL THAT APPLY"
             />
             <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Button 
                  variant={selectedRedFlags.length === 0 ? "primary" : "outline"} 
                  onPress={() => handleNext("Denied")} 
                  title="None of these apply"
                  style={{ flex: 1 }}
                  disabled={processing}
                />
                {selectedRedFlags.length > 0 && (
                  <Button 
                    variant="primary"
                    onPress={() => handleNext(`I have: ${selectedRedFlags.join(', ')}`)}
                    title="Confirm"
                    style={{ flex: 1 }}
                    disabled={processing}
                  />
                )}
             </View>
           </View>
         ) : (
           <>
             {/* Offline Chips */}
             {offlineOptions && (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                     {offlineOptions.map(opt => (
                         <Chip key={opt.label} onPress={() => handleNext(opt.label)} disabled={processing}>{opt.label}</Chip>
                     ))}
                 </ScrollView>
             )}

             {/* AI Generated Options */}
             {!isOfflineMode && currentQuestion?.options && (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                     {currentQuestion.options.map(opt => (
                         <Chip key={opt} onPress={() => handleNext(opt)} disabled={processing}>{opt}</Chip>
                     ))}
                 </ScrollView>
             )}
             
             {/* Skip Button for AI Mode */}
             {!isOfflineMode && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 8 }}>
                    <Chip mode="outlined" compact onPress={() => handleNext(undefined, true)} disabled={processing}>I'm not sure</Chip>
                </View>
             )}

             <InputCard
                ref={inputCardRef}
                value={inputText}
                onChangeText={setInputText}
                onSubmit={() => handleNext()}
                label={isOfflineMode ? "Select an option above" : "Type your answer..."}
                isRecording={isRecording}
                volume={volume}
                onVoicePress={isRecording ? stopRecording : startRecording}
                disabled={processing || (isOfflineMode && !!offlineOptions)}
             />
           </>
         )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContainer: { flex: 1 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  userWrapper: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, elevation: 1 },
  assistantBubble: { borderBottomLeftRadius: 4 },
  userBubble: { borderBottomRightRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  inputSection: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }
});

export default SymptomAssessmentScreen;