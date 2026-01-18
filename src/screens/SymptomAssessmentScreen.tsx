import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  UIManager,
  Keyboard,
  Animated,
  BackHandler,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  getGeminiResponse,
  streamGeminiResponse,
} from '../services/gemini';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { setHighRisk } from '../store/navigationSlice';
import { TriageEngine } from '../services/triageEngine';
import { TriageArbiter } from '../services/triageArbiter';
import { TriageFlow, AssessmentQuestion, AssessmentProfile } from '../types/triage';
import { extractClinicalSlots } from '../utils/clinicalUtils';

const triageFlow = require('../../assets/triage-flow.json') as TriageFlow;

import StandardHeader from '../components/common/StandardHeader';
import { Button } from '../components/common/Button';
import {
  InputCard,
  TypingIndicator,
  InputCardRef,
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

const formatSelectionAnswer = (question: AssessmentQuestion, selections: string[]) => {
  // 1. Handle "None"
  const labels = selections.filter(i => i.toLowerCase() !== 'none');
  if (labels.length === 0) {
     return "No, I don't have any of those.";
  }
  
  const joined = labels.join(', ');

  // 2. Context-aware formatting based on ID
  switch (question.id) {
      case 'age':
          return `I am ${joined} years old.`;
      case 'duration':
          return `It has been happening for ${joined}.`;
      case 'severity':
          return `It is ${joined}.`;
      case 'red_flags':
          // Red flags explicitly implies symptoms
          return `I'm experiencing ${joined}.`;
      default:
           // 3. Fallback based on question text content
           const lowerText = question.text.toLowerCase();
           if (lowerText.includes('symptom') || lowerText.includes('experiencing')) {
               return `I'm experiencing ${joined}.`;
           }
           return joined; 
  }
};

const SymptomAssessmentScreen = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputCardRef = useRef<InputCardRef>(null);
  const hasShownClarificationHeader = useRef(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const { initialSymptom } = route.params || { initialSymptom: '' };

  // Core State
  const [messages, setMessages] = useState<Message[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [fullPlan, setFullPlan] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // Map question ID -> User Answer
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [expansionCount, setExpansionCount] = useState(0);
  const [readiness, setReadiness] = useState(0.0); // 0.0 to 1.0
  const MAX_EXPANSIONS = 2;
  
  // UI Interactions
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  
  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  // Reset checklist when question changes
  useEffect(() => {
    setSelectedRedFlags([]);
  }, [currentQuestionIndex]);

  // --- READINESS VISUALIZATION ---
  const getReadinessVisuals = (score: number) => {
    if (score <= 0.40) return { label: "Gathering initial symptoms…", color: theme.colors.error }; // Red/Orange
    if (score <= 0.70) return { label: "Checking risk factors…", color: theme.colors.secondary }; // Yellow
    if (score <= 0.90) return { label: "Analyzing specifics…", color: theme.colors.primary }; // Green
    return { label: "Finalizing recommendation…", color: '#2196F3' }; // Blue
  };

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

    // --- AUTO-SCROLL LOGIC ---
    useEffect(() => {
      const scrollTimer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100); // Small delay to allow layout to settle
      return () => clearTimeout(scrollTimer);
    }, [messages, isTyping]);
  
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
        setFullPlan(plan);
        
        // --- NEW: Dynamic Question Pruning ---
        // Use deterministic slot extraction to identify if Tier 1 questions are already answered
        const slots = extractClinicalSlots(initialSymptom || '');
        const initialAnswers: Record<string, string> = {};
        
        const prunedPlan = plan.filter(q => {
            // SAFETY: Never prune red-flag questions or Tier 2/3 context questions
            if (q.id === 'red_flags' || !['basics', 'age', 'duration'].includes(q.id)) return true;
            
            // Check for Tier 1 questions
            if (q.id === 'basics') {
                if (slots.age && slots.duration) {
                    console.log(`[Assessment] Pruning basics. Found Age: ${slots.age}, Duration: ${slots.duration}`);
                    initialAnswers[q.id] = `${slots.age}, for ${slots.duration}`;
                    return false;
                }
            } else if (q.id === 'age') {
                if (slots.age) {
                    console.log(`[Assessment] Pruning age. Found: ${slots.age}`);
                    initialAnswers[q.id] = slots.age;
                    return false;
                }
            } else if (q.id === 'duration') {
                if (slots.duration) {
                    console.log(`[Assessment] Pruning duration. Found: ${slots.duration}`);
                    initialAnswers[q.id] = slots.duration;
                    return false;
                }
            }
            return true;
        });

        setQuestions(prunedPlan);
        setAnswers(initialAnswers); // Preserve answers for pruned questions for the final report
        
        // Add Intro & First Question
        const firstQ = prunedPlan[0];
        const introText = `I've noted your report of "${initialSymptom}". To help me provide the best guidance, I have a few questions.\n\n${firstQ.text}`;
        
        setMessages([
          { id: 'intro', text: introText, sender: 'assistant' }
        ]);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Initialization Error:', err);
        if (err.message === 'NETWORK_ERROR') {
           startOfflineTriage();
        } else {
           setLoading(false);
        }
      }
    };
  
    // --- INTERACTION LOGIC ---
    
    const handleNext = async (answerOverride?: string) => {
      const answer = answerOverride || inputText;
      if (!answer.trim() || processing) return;
  
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ && !isOfflineMode) return;
  
      setProcessing(true);
      setInputText('');
  
      // 1. Append User Message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        text: answer,
        sender: 'user',
        isOffline: isOfflineMode
      };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setIsTyping(true);
  
      // 2. Emergency Check (Local, Deterministic)
      if (!isOfflineMode) {
          // Provide context of what has been discussed so far for the SOAP note
          const historyContext = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .join('. ');

          const safetyCheck = detectEmergency(answer, { 
            isUserInput: true,
            historyContext: historyContext
          });
          
          // Log the step
          logConversationStep(currentQuestionIndex, currentQ.text, answer, safetyCheck);
  
          if (safetyCheck.isEmergency) {
              dispatch(setHighRisk(true));
              setIsTyping(false);
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
          const newAnswers = { ...answers, [currentQ.id]: answer };
          setAnswers(newAnswers);
  
          // 4. Progress or Finish
          const nextIdx = currentQuestionIndex + 1;
          const isAtEnd = nextIdx >= questions.length;

          // --- NEW: Unified Triage Arbiter Gate ---
          // The Arbiter now has authority over whether we continue or stop.
          // We check this starting at Turn 0 (every turn) to allow for early interventions.
          if (nextIdx >= 0 || isAtEnd) {
              console.log(`[Assessment] Turn ${nextIdx} reached. Consulting Arbiter...`);
              try {
                  const historyItems = nextHistory.map(m => ({
                      role: m.sender as 'user' | 'assistant',
                      text: m.text
                  }));
                  const profile = await extractClinicalProfile(historyItems);
                  
                  // Update Readiness Visualization
                  if (profile.triage_readiness_score !== undefined) {
                    setReadiness(profile.triage_readiness_score);
                  }

                  // --- CONTRADICTION LOCK (Deterministic Guardrail) ---
                  const isAmbiguous = profile.ambiguity_detected === true;
                  const hasFriction = profile.clinical_friction_detected === true;
                  
                  // Explicitly check for remaining Tier 3 questions in the active plan
                  const remainingTier3 = questions.slice(nextIdx).filter(q => q.tier === 3);
                  const hasUnattemptedTier3 = remainingTier3.length > 0;

                  if (isAmbiguous || hasFriction || hasUnattemptedTier3) {
                      console.warn(`[GUARDRAIL] CONTRADICTION LOCK ACTIVATED: Ambiguity=${isAmbiguous}, Friction=${hasFriction}, UnattemptedTier3=${hasUnattemptedTier3}`);
                  }

                  // --- TURN FLOOR LOCK (Deterministic Category Floor) ---
                  const isComplexCategory = profile.symptom_category === 'complex' || profile.symptom_category === 'critical' || profile.is_complex_case;
                  const minTurnsRequired = isComplexCategory ? 7 : 4;
                  const isBelowFloor = nextIdx < minTurnsRequired;

                  if (isBelowFloor) {
                      console.warn(`[GUARDRAIL] TURN FLOOR LOCK ACTIVATED: Category=${isComplexCategory ? 'Complex' : 'Simple'}, Turns=${nextIdx}, Required=${minTurnsRequired}`);
                  }

                  const effectiveReadiness = (isAmbiguous || hasFriction || isBelowFloor) ? 0 : (profile.triage_readiness_score || 0);
                  const TERMINATION_THRESHOLD = 0.90;

                  const arbiterResult = TriageArbiter.evaluateAssessmentState(
                    historyItems,
                    profile, 
                    nextIdx, 
                    questions.length,
                    questions.slice(nextIdx)
                  );

                  console.log(`[Assessment] Arbiter Signal: ${arbiterResult.signal}. Reason: ${arbiterResult.reason}`);
                  console.log(`[Assessment] Effective Readiness: ${effectiveReadiness} (Ambiguity: ${isAmbiguous}, Friction: ${hasFriction}, BelowFloor: ${isBelowFloor})`);

                  // HARD STOP: Contradiction Lock and Turn Floor Lock prevent termination regardless of readiness.
                  const canTerminate = arbiterResult.signal === 'TERMINATE' && 
                                     !isAmbiguous && 
                                     !hasFriction && 
                                     !hasUnattemptedTier3 &&
                                     !isBelowFloor &&
                                     effectiveReadiness >= TERMINATION_THRESHOLD;

                  // --- CLARIFICATION FEEDBACK (User Guidance) ---
                  const needsClarificationHeader = isAmbiguous || hasFriction;
                  let clarificationHeader = "";

                  if (needsClarificationHeader && !hasShownClarificationHeader.current) {
                    clarificationHeader = "To ensure I fully understand your situation and provide the safest advice, I'd like to clarify a few details.\n\n";
                    hasShownClarificationHeader.current = true;
                  }

                  if (canTerminate) {
                      console.log('[Assessment] Arbiter approved termination. Finalizing.');
                      setIsTyping(false);
                      setMessages(prev => [...prev, {
                          id: 'early-exit',
                          text: "Thank you. I have sufficient information to provide a safe recommendation.",
                          sender: 'assistant'
                      }]);
                      setTimeout(() => finalizeAssessment(newAnswers, nextHistory, profile), 1000);
                      return;
                  }

                  // Handle Priority Signals
                  if (arbiterResult.signal === 'PRIORITIZE_RED_FLAGS' || arbiterResult.signal === 'RESOLVE_AMBIGUITY' || arbiterResult.signal === 'RESOLVE_FRICTION') {
                      console.log(`[Assessment] Reordering queue based on Arbiter signal: ${arbiterResult.signal}`);
                      const remaining = questions.slice(nextIdx);
                      const priority = remaining.filter(q => {
                        if (arbiterResult.signal === 'PRIORITIZE_RED_FLAGS') return q.is_red_flag;
                        if (arbiterResult.signal === 'RESOLVE_AMBIGUITY' || arbiterResult.signal === 'RESOLVE_FRICTION') return q.tier === 3;
                        return false;
                      });
                      const nonPriority = remaining.filter(q => {
                        if (arbiterResult.signal === 'PRIORITIZE_RED_FLAGS') return !q.is_red_flag;
                        if (arbiterResult.signal === 'RESOLVE_AMBIGUITY' || arbiterResult.signal === 'RESOLVE_FRICTION') return q.tier !== 3;
                        return true;
                      });
                      
                      const reordered = [...questions.slice(0, nextIdx), ...priority, ...nonPriority];
                      setQuestions(reordered);
                  }

                  // Handle Progress Reset / False Positive Safeguard
                  if (arbiterResult.needs_reset) {
                      console.log('[Assessment] Resetting progress indicators due to false positive completeness check');
                      setMessages(prev => [...prev, {
                          id: `system-reset-${Date.now()}`,
                          text: "I need to double-check some of the information provided to ensure my guidance is safe and accurate. Let's look closer at your symptoms.",
                          sender: 'assistant'
                      }]);
                  }
                  
                  // SAFETY GATE: If plan is exhausted but we are NOT ready to terminate (due to ambiguity or score)
                  // we MUST generate additional resolution questions instead of terminating.
                  const currentExpansion = expansionCount;
                  if (isAtEnd && !canTerminate && currentExpansion < MAX_EXPANSIONS) {
                      console.log(`[Assessment] Plan exhausted but safety criteria not met. Expansion ${currentExpansion + 1}/${MAX_EXPANSIONS}. Fetching more questions.`);
                      setIsTyping(true);
                      
                      const followUpPrompt = `The assessment for "${initialSymptom}" is incomplete or ambiguous. History: ${historyItems.map(h => h.text).join('. ')}. Generate 3 specific follow-up questions to resolve clinical ambiguity and safety concerns. Return JSON format matching the original question schema.`;
                      try {
                          let accumulatedResponse = '';
                          setStreamingText(''); // Initialize streaming bubble
                          
                          const stream = streamGeminiResponse(followUpPrompt);
                          for await (const chunk of stream) {
                            accumulatedResponse += chunk;
                            setStreamingText(prev => (prev || '') + chunk);
                          }
                          
                          if (accumulatedResponse) {
                              const jsonMatch = accumulatedResponse.match(/\{[\s\S]*\}/);
                              if (jsonMatch) {
                                  const parsed = JSON.parse(jsonMatch[0]);
                                  const newQuestions = (parsed.questions || []).map((q: any, i: number) => ({...q, id: `extra-${nextIdx}-${currentExpansion}-${i}`, tier: 3}));
                                  
                                  if (newQuestions.length > 0) {
                                      const updatedQuestions = [...questions, ...newQuestions];
                                      const nextQ = updatedQuestions[nextIdx];
                                      
                                      // Commit finalized message
                                      setMessages(prev => [...prev, {
                                          id: `ai-extra-${nextIdx}-${currentExpansion}`,
                                          text: clarificationHeader + nextQ.text,
                                          sender: 'assistant'
                                      }]);
                                      
                                      setQuestions(updatedQuestions);
                                      setExpansionCount(currentExpansion + 1);
                                      setCurrentQuestionIndex(nextIdx);
                                      
                                      // Clear streaming state AFTER committing message to avoid flicker
                                      setStreamingText(null); 
                                      setIsTyping(false);
                                      setProcessing(false);
                                      return; 
                                  }
                              }
                          }
                          // Fallback if parsing fails or no questions
                          setStreamingText(null);
                      } catch (err) {
                          console.error('[Assessment] Failed to fetch expansion questions:', err);
                          setStreamingText(null);
                      }
                  }
                  
                  // If we reached here and it'sAtEnd and we can't terminate, we might have hit MAX_EXPANSIONS or expansion failed
                  if (isAtEnd && !canTerminate) {
                      console.log(`[Assessment] Safety criteria not met (Readiness: ${effectiveReadiness}) but plan cannot be expanded further. Finalizing with conservative fallback.`);
                      setIsTyping(false);
                      setMessages(prev => [...prev, {
                          id: 'finalizing-safety-fallback',
                          text: "I have gathered enough initial information to provide a safe recommendation.",
                          sender: 'assistant'
                      }]);
                      setTimeout(() => finalizeAssessment(newAnswers, nextHistory, profile), 1000);
                      return;
                  }

                  // If we are continuing within the planned questions after Turn 4 check
                  if (!isAtEnd) {
                      setIsTyping(true);
                      setTimeout(() => {
                          const nextQ = questions[nextIdx];
                          setMessages(prev => [...prev, {
                              id: `ai-${nextIdx}`,
                              text: clarificationHeader + nextQ.text,
                              sender: 'assistant'
                          }]);
                          setCurrentQuestionIndex(nextIdx);
                          setIsTyping(false);
                          setProcessing(false);
                      }, 600);
                      return;
                  }
                  
              } catch (e) {
                  console.warn('[Assessment] Arbiter consultation or follow-up failed, continuing planned path...', e);
              }
          }

          if (!isAtEnd) {
              // Next Question (Fallback if Arbiter check fails or is skipped)
              setIsTyping(true);
              setTimeout(() => {
                  const nextQ = questions[nextIdx];
                  setMessages(prev => [...prev, {
                      id: `ai-${nextIdx}`,
                      text: nextQ.text,
                      sender: 'assistant'
                  }]);
                  setCurrentQuestionIndex(nextIdx);
                  setIsTyping(false);
                  setProcessing(false);
              }, 600);
          } else {
              // EXHAUSTED QUESTIONS -> Finalize
              setIsTyping(false);
              setMessages(prev => [...prev, {
                  id: 'finalizing',
                  text: "Thank you. I'm now analyzing your responses to provide the best guidance...",
                  sender: 'assistant'
              }]);
              setTimeout(() => {
                  finalizeAssessment(newAnswers, nextHistory);
              }, 1500);
          }
      } else {
          // Offline Flow Handling
          handleOfflineLogic(answer);
      }
    };
  
    const finalizeAssessment = async (finalAnswers: Record<string, string>, currentHistory: Message[], preExtractedProfile?: AssessmentProfile) => {
      console.log('[Assessment] Finalizing... Extracting Slots.');
      
      try {
          const profile = preExtractedProfile || await extractClinicalProfile(currentHistory.map(m => ({
              role: m.sender, 
              text: m.text 
          })));
          
          console.log('\n╔═══ FINAL PROFILE EXTRACTION ═══╗');
          console.log(JSON.stringify(profile, null, 2));
          console.log(`╚${'═'.repeat(32)}╝\n`);
  
          // Format for Recommendation Screen
          const formattedAnswers = fullPlan.map(q => ({
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
      } catch (_) {
          Alert.alert("Error", "Could not process results. Please try again.");
          setProcessing(false);
          setIsTyping(false);
      }
    };
  // --- OFFLINE LOGIC ---
  const startOfflineTriage = () => {
    setIsOfflineMode(true);
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
            setIsTyping(false);
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

  const readinessVisuals = getReadinessVisuals(readiness);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader title="Assessment" showBackButton onBackPress={handleBack} />
      
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
         <ProgressBar 
            progress={isOfflineMode ? 0.5 : readiness}
            label={isOfflineMode ? "Emergency Check" : readinessVisuals.label}
            color={isOfflineMode ? theme.colors.primary : readinessVisuals.color}
         />
      </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            {/* Streaming Message Bubble */}
            {streamingText && (
              <View style={[styles.messageWrapper, styles.assistantWrapper]}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="robot" size={18} color={theme.colors.primary} />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.messageText, { color: theme.colors.onSurface }]}>{streamingText}</Text>
                </View>
              </View>
            )}
            {isTyping && !streamingText && (
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
         {/* Checklist / Radio UI */}
         {!isOfflineMode && currentQuestion && (currentQuestion.type === 'multi-select' || (currentQuestion.options && currentQuestion.options.length > 0)) ? (
           <View style={{ paddingBottom: 8 }}>
             <Text 
               variant="titleSmall" 
               style={{ 
                 marginBottom: 8, 
                 paddingHorizontal: 16, 
                 letterSpacing: 1.5, 
                 fontWeight: '700', 
                 fontSize: 12, 
                 color: theme.colors.onSurfaceVariant 
               }}
             >
               {currentQuestion.type === 'multi-select' ? 'SELECT ALL THAT APPLY' : 'SELECT ONE'}
             </Text>
             <View style={{ maxHeight: SCREEN_HEIGHT / 3 }}>
               <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                 <MultiSelectChecklist
                   options={
                     (currentQuestion.options
                       ? currentQuestion.options.map(opt => {
                           if (typeof opt === 'string') return { id: opt, label: opt };
                           return {
                             category: opt.category,
                             items: opt.items.map(i => ({ id: i, label: i }))
                           };
                         })
                       : parseRedFlags(currentQuestion.text)) as any
                   }
                   selectedIds={selectedRedFlags}
                   singleSelection={currentQuestion.type !== 'multi-select'}
                   onSelectionChange={(ids) => {
                     // Mutual exclusivity for "None" in Multi-Select
                     if (currentQuestion.type === 'multi-select') {
                         const lastAdded = ids.find(id => !selectedRedFlags.includes(id));
                         if (lastAdded?.toLowerCase() === 'none') {
                            setSelectedRedFlags([lastAdded]);
                         } else if (ids.length > 1 && ids.some(id => id.toLowerCase() === 'none')) {
                            setSelectedRedFlags(ids.filter(id => id.toLowerCase() !== 'none'));
                         } else {
                            setSelectedRedFlags(ids);
                         }
                     } else {
                         // Single select (Radio) logic is handled by the component returning [id]
                         setSelectedRedFlags(ids);
                     }
                   }}
                 />
               </ScrollView>
             </View>
             <View style={{ marginTop: 8, gap: 8 }}>
                <Button 
                  testID="button-confirm"
                  variant="primary"
                  onPress={() => {
                    handleNext(formatSelectionAnswer(currentQuestion, selectedRedFlags));
                  }}
                  title="Confirm"
                  style={{ width: '100%' }}
                  disabled={processing || (currentQuestion.type !== 'multi-select' && selectedRedFlags.length === 0)}
                  accessibilityLabel="Confirm selection"
                  accessibilityRole="button"
                />
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