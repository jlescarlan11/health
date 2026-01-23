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
  streamGeminiResponse,
  getGeminiResponse,
} from '../services/gemini';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { setHighRisk } from '../store/navigationSlice';
import { TriageEngine } from '../services/triageEngine';
import { TriageArbiter, TriageSignal } from '../services/triageArbiter';
import { TriageFlow, AssessmentQuestion, AssessmentProfile, GroupedOption } from '../types/triage';
import { extractClinicalSlots } from '../utils/clinicalUtils';
import { BRIDGE_PROMPT } from '../constants/prompts';

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

type AssessmentStage = 'intake' | 'follow_up' | 'review' | 'generating';

const isNoneOption = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower === 'none' ||
    lower === 'none of the above' ||
    lower === 'none of these' ||
    lower === 'none of these apply'
  );
};

const parseRedFlags = (text: string): { id: string; label: string }[] => {
  // 1. Try to find a list after a colon
  let content = text;
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    content = text.substring(colonIndex + 1);
  } else {
    // 2. Try to find a list after specific keywords if no colon
    const keywords = ['including', 'like', 'such as', 'following', 'these:'];
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
  const rawItems = content
    .split(/,| or /)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Deduplicate and format
  const uniqueItems = Array.from(new Set(rawItems));

  return uniqueItems.map((item) => ({
    id: item, // Use label as ID for simplicity here
    label: item.charAt(0).toUpperCase() + item.slice(1),
  }));
};

const formatSelectionAnswer = (question: AssessmentQuestion, selections: string[]) => {
  // 1. Handle "None"
  const labels = selections.filter((i) => !isNoneOption(i));
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
  const keyboardScrollRaf = useRef<number | null>(null);
  const { initialSymptom } = route.params || { initialSymptom: '' };
  const trimmedInitialSymptom = (initialSymptom || '').trim();
  const hasInitialSymptom = trimmedInitialSymptom.length > 0;
  const safetySymptomReference = hasInitialSymptom
    ? `"${trimmedInitialSymptom}"`
    : 'the symptoms you shared earlier';
  const safetyShortLabel = hasInitialSymptom ? 'those symptoms' : 'your current concern';

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
  const [assessmentStage, setAssessmentStage] = useState<AssessmentStage>('intake');
  const [hasAdvancedBeyondIntake, setHasAdvancedBeyondIntake] = useState(false);
  const [arbiterSignal, setArbiterSignal] = useState<TriageSignal | null>(null);
  const [symptomCategory, setSymptomCategory] = useState<'simple' | 'complex' | 'critical' | null>(
    null,
  );
  const [previousProfile, setPreviousProfile] = useState<AssessmentProfile | undefined>(undefined);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [showRedFlagsChecklist, setShowRedFlagsChecklist] = useState(false);
  const [isClarifyingDenial, setIsClarifyingDenial] = useState(false);
  const [isRecentResolved, setIsRecentResolved] = useState(false);
  const [resolvedKeyword, setResolvedKeyword] = useState<string | null>(null);

  // Offline
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentOfflineNodeId, setCurrentOfflineNodeId] = useState<string | null>(null);

  // Ref sync to prevent closure staleness in setTimeout callbacks
  const isRecentResolvedRef = useRef(isRecentResolved);
  const resolvedKeywordRef = useRef(resolvedKeyword);
  useEffect(() => {
    isRecentResolvedRef.current = isRecentResolved;
    resolvedKeywordRef.current = resolvedKeyword;
  }, [isRecentResolved, resolvedKeyword]);

  const MAX_EXPANSIONS = 2;
  const MAX_CLARIFICATIONS = 2;

  // Cleanup temporal state on unmount or restart
  useEffect(() => {
    return () => {
      setIsRecentResolved(false);
      setResolvedKeyword(null);
    };
  }, []);

  // Emergency Verification State
  const [isVerifyingEmergency, setIsVerifyingEmergency] = useState(false);
  const isVerifyingEmergencyRef = useRef(isVerifyingEmergency);
  useEffect(() => {
    isVerifyingEmergencyRef.current = isVerifyingEmergency;
  }, [isVerifyingEmergency]);

  const [emergencyVerificationData, setEmergencyVerificationData] = useState<{
    keyword: string;
    answer: string;
    currentQ: AssessmentQuestion;
    safetyCheck: any;
  } | null>(null);
  const [suppressedKeywords, setSuppressedKeywords] = useState<string[]>([]);

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
    setShowRedFlagsChecklist(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (hasAdvancedBeyondIntake) return;
    const hasUserProgress =
      currentQuestionIndex > 0 ||
      Object.keys(answers).length > 0 ||
      messages.some((msg) => msg.sender === 'user');
    if (hasUserProgress) {
      setHasAdvancedBeyondIntake(true);
      if (assessmentStage === 'intake' && !isOfflineMode) {
        setAssessmentStage('follow_up');
      }
    }
  }, [
    answers,
    assessmentStage,
    currentQuestionIndex,
    hasAdvancedBeyondIntake,
    isOfflineMode,
    messages,
  ]);

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
    const scheduleScrollToEnd = (animated: boolean) => {
      if (keyboardScrollRaf.current !== null) {
        cancelAnimationFrame(keyboardScrollRaf.current);
      }
      keyboardScrollRaf.current = requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      });
    };

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: e.duration || 250,
          useNativeDriver: false,
        }).start();
        scheduleScrollToEnd(true);
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
        scheduleScrollToEnd(true);
      },
    );

    const keyboardWillChangeFrame =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', (e) => {
            const nextHeight = Math.max(0, SCREEN_HEIGHT - e.endCoordinates.screenY);
            keyboardHeight.setValue(nextHeight);
            scheduleScrollToEnd(false);
          })
        : null;

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (keyboardWillChangeFrame) {
        keyboardWillChangeFrame.remove();
      }
      if (keyboardScrollRaf.current !== null) {
        cancelAnimationFrame(keyboardScrollRaf.current);
      }
      speechService.stopListening();
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
  }, [messages, isTyping, isVerifyingEmergency]);

  const initializeAssessment = async () => {
    // 1. Initial Emergency Check (Locally)
    const emergencyCheck = detectEmergency(initialSymptom || '', { isUserInput: true });
    const mentalHealthCheck = detectMentalHealthCrisis(initialSymptom || '');

    if (emergencyCheck.isEmergency || mentalHealthCheck.isCrisis) {
      console.log(
        '[Assessment] IMMEDIATE ESCALATION - Emergency/Crisis detected in initial symptom',
      );
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

      const { questions: plan, intro } = await generateAssessmentPlan(initialSymptom || '');
      setFullPlan(plan);

      // --- NEW: Dynamic Question Pruning ---
      // Use deterministic slot extraction to identify if Tier 1 questions are already answered
      const slots = extractClinicalSlots(initialSymptom || '');
      const initialAnswers: Record<string, string> = {};

      const prunedPlan = plan.filter((q) => {
        // SAFETY: Never prune red-flag questions or Tier 2/3 context questions
        if (q.id === 'red_flags' || !['basics', 'age', 'duration', 'severity'].includes(q.id))
          return true;

        // Check for Tier 1 questions
        if (q.id === 'basics') {
          if (slots.age && slots.duration) {
            console.log(
              `[Assessment] Pruning basics. Found Age: ${slots.age}, Duration: ${slots.duration}`,
            );
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
        } else if (q.id === 'severity') {
          if (slots.severity) {
            console.log(`[Assessment] Pruning severity. Found: ${slots.severity}`);
            initialAnswers[q.id] = slots.severity;
            return false;
          }
        }
        return true;
      });

      setQuestions(prunedPlan);
      setAnswers(initialAnswers); // Preserve answers for pruned questions for the final report

      // Add Intro & First Question
      const firstQ = prunedPlan[0];
      const introText = intro
        ? `${intro}\n\n${firstQ.text}`
        : `I've noted your report of "${initialSymptom}". To help me provide the best guidance, I have a few questions.\n\n${firstQ.text}`;

      setMessages([{ id: 'intro', text: introText, sender: 'assistant' }]);

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

  const handleNext = async (answerOverride?: string, skipEmergencyCheck = false) => {
    const answer = answerOverride || inputText;
    if (!answer.trim() || processing) return;

    if (isClarifyingDenial) setIsClarifyingDenial(false);

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ && !isOfflineMode) return;

    setProcessing(true);
    if (!skipEmergencyCheck) {
      setInputText('');
    }

    // 1. Append User Message
    let nextHistory = messages;
    if (!skipEmergencyCheck) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        text: answer,
        sender: 'user',
        isOffline: isOfflineMode,
      };
      nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
    }
    setIsTyping(true);

    // 2. Emergency Check (Local, Deterministic)
    if (!isOfflineMode && !skipEmergencyCheck) {
      // Provide context of what has been discussed so far for the SOAP note
      const historyContext = messages
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join('. ');

      const safetyCheck = detectEmergency(answer, {
        isUserInput: true,
        historyContext: historyContext,
        questionId: currentQ.id,
      });

      // Log the step
      logConversationStep(currentQuestionIndex, currentQ.text, answer, safetyCheck);

      if (safetyCheck.isEmergency) {
        const activeKeywords =
          safetyCheck.matchedKeywords?.filter((k) => !suppressedKeywords.includes(k)) || [];

        if (activeKeywords.length > 0) {
          console.log(
            `[Assessment] POTENTIAL EMERGENCY DETECTED: ${activeKeywords.join(', ')}. Triggering verification.`,
          );
          setIsVerifyingEmergency(true);
          setEmergencyVerificationData({
            keyword: activeKeywords[0],
            answer,
            currentQ,
            safetyCheck,
          });
          setProcessing(false);
          setIsTyping(false);
          return;
        }
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
          const historyItems = nextHistory.map((m) => ({
            role: m.sender as 'user' | 'assistant',
            text: m.text,
          }));
          const profile = await extractClinicalProfile(historyItems);

          // --- DYNAMIC PLAN PRUNING ---
          // Filter out future questions if their slots (Age, Duration, Severity, Progression)
          // have been populated by the latest AI extraction.
          let activeQuestions = questions;
          const slotsToCheck = ['age', 'duration', 'severity', 'progression'];
          const populatedSlots = slotsToCheck.filter(
            (slot) => profile[slot as keyof AssessmentProfile],
          );

          if (populatedSlots.length > 0) {
            const historyPart = questions.slice(0, nextIdx);
            const futurePart = questions.slice(nextIdx);

            const prunedFuture = futurePart.filter((q) => {
              if (populatedSlots.includes(q.id)) {
                console.log(
                  `[Assessment] Pruning redundant question '${q.id}' - Slot populated via extraction`,
                );
                return false;
              }
              return true;
            });

            if (prunedFuture.length !== futurePart.length) {
              const newQuestionList = [...historyPart, ...prunedFuture];
              setQuestions(newQuestionList);
              activeQuestions = newQuestionList;
            }
          }

          console.log(`[DEBUG_NEXT_LOGIC] nextIdx: ${nextIdx}, activeQuestions.length: ${activeQuestions.length}`);
          let effectiveIsAtEnd = nextIdx >= activeQuestions.length;

          // Update Readiness Visualization
          if (profile.triage_readiness_score !== undefined) {
            setReadiness(profile.triage_readiness_score);
          }

          if (profile.symptom_category) {
            setSymptomCategory(profile.symptom_category);
          }

          // --- CONTRADICTION LOCK (Deterministic Guardrail) ---
          const isAmbiguous = profile.ambiguity_detected === true;
          const hasFriction = profile.clinical_friction_detected === true;

          // Explicitly check for remaining Tier 3 questions in the active plan
          const remainingTier3 = activeQuestions.slice(nextIdx).filter((q) => q.tier === 3);
          const hasUnattemptedTier3 = remainingTier3.length > 0;

          if (isAmbiguous || hasFriction || hasUnattemptedTier3) {
            console.warn(
              `[GUARDRAIL] CONTRADICTION LOCK ACTIVATED: Ambiguity=${isAmbiguous}, Friction=${hasFriction}, UnattemptedTier3=${hasUnattemptedTier3}`,
            );
          }

          // --- TURN FLOOR LOCK (Deterministic Category Floor) ---
          const isComplexCategory =
            profile.symptom_category === 'complex' ||
            profile.symptom_category === 'critical' ||
            profile.is_complex_case;
          const minTurnsRequired = isComplexCategory ? 7 : 4;
          const isBelowFloor = nextIdx < minTurnsRequired;

          if (isBelowFloor) {
            console.warn(
              `[GUARDRAIL] TURN FLOOR LOCK ACTIVATED: Category=${isComplexCategory ? 'Complex' : 'Simple'}, Turns=${nextIdx}, Required=${minTurnsRequired}`,
            );
          }

          const effectiveReadiness =
            isAmbiguous || hasFriction || isBelowFloor ? 0 : profile.triage_readiness_score || 0;
          const TERMINATION_THRESHOLD = 0.9;

          const arbiterResult = TriageArbiter.evaluateAssessmentState(
            historyItems,
            profile,
            nextIdx,
            activeQuestions.length,
            activeQuestions.slice(nextIdx),
            previousProfile,
            clarificationCount,
          );

          setPreviousProfile(profile);

          setArbiterSignal(arbiterResult.signal);
          console.log(
            `[Assessment] Arbiter Signal: ${arbiterResult.signal}. Reason: ${arbiterResult.reason}`,
          );
          console.log(
            `[Assessment] Effective Readiness: ${effectiveReadiness} (Ambiguity: ${isAmbiguous}, Friction: ${hasFriction}, BelowFloor: ${isBelowFloor}, Saturation: ${arbiterResult.saturation_count}, Clarifications: ${clarificationCount})`,
          );

          // Handle Clarification Signal (Force Clarification for Hedging/Ambiguous Denial)
          if (arbiterResult.signal === 'REQUIRE_CLARIFICATION' && !arbiterResult.needs_reset) {
            console.log(`[Assessment] Arbiter requesting clarification. Count: ${clarificationCount + 1}/${MAX_CLARIFICATIONS}`);
            
            // Extract the hedged symptom from friction details if possible
            // Format: [System] Hedging detected in: fieldName ("detectedPhrase")
            const hedgingMatch = profile.clinical_friction_details?.match(/Hedging detected in: ([^ ]+) \("(.*)"\)/);
            const hedgedField = hedgingMatch ? hedgingMatch[1] : 'symptoms you mentioned';
            
            setIsClarifyingDenial(true);
            setClarificationCount((prev) => prev + 1);
            setIsTyping(false);
            
            const clarificationText = clarificationCount === 0 
              ? `I want to be perfectly safe. You mentioned "${hedgedField}" might be present. To be certain, is this happening to you right now?`
              : `I'm still a bit unsure about your safety regarding "${hedgedField}". It's important for me to know for sure: are you experiencing this right now?`;

            setMessages((prev) => [
              ...prev,
              {
                id: `system-clarify-${Date.now()}`,
                text: clarificationText,
                sender: 'assistant',
              },
            ]);
            setProcessing(false);
            return;
          }

          // HARD STOP: Contradiction Lock and Turn Floor Lock prevent termination regardless of readiness.
          // EXCEPTION: Clinical Saturation overrides the turn floor if stability is proven.
          const isSaturationTermination = arbiterResult.reason?.includes('CLINICAL SATURATION');

          const canTerminate =
            arbiterResult.signal === 'TERMINATE' &&
            !isAmbiguous &&
            !hasFriction &&
            !hasUnattemptedTier3 &&
            (!isBelowFloor || isSaturationTermination) &&
            effectiveReadiness >= TERMINATION_THRESHOLD;

          // --- CLARIFICATION FEEDBACK (User Guidance) ---
          const needsClarificationHeader = isAmbiguous || hasFriction;
          let clarificationHeader = '';

          if (needsClarificationHeader && !hasShownClarificationHeader.current) {
            clarificationHeader =
              "To ensure I fully understand your situation and provide the safest advice, I'd like to clarify a few details.\n\n";
            hasShownClarificationHeader.current = true;
          }

            if (canTerminate) {
              console.log('[Assessment] Arbiter approved termination. Finalizing.');
              setIsTyping(false);
              setAssessmentStage('review');
              setMessages((prev) => [
              ...prev,
              {
                id: 'early-exit',
                text: 'Thank you. I have sufficient information to provide a safe recommendation.',
                sender: 'assistant',
              },
            ]);
            setTimeout(() => finalizeAssessment(newAnswers, nextHistory, profile), 1000);
            return;
          }

          // Handle Priority Signals
          if (
            arbiterResult.signal === 'PRIORITIZE_RED_FLAGS' ||
            arbiterResult.signal === 'RESOLVE_AMBIGUITY'
          ) {
            console.log(
              `[Assessment] Reordering queue based on Arbiter signal: ${arbiterResult.signal}`,
            );
            const remaining = activeQuestions.slice(nextIdx);
            const priority = remaining.filter((q) => {
              if (arbiterResult.signal === 'PRIORITIZE_RED_FLAGS') return q.is_red_flag;
              if (arbiterResult.signal === 'RESOLVE_AMBIGUITY') return q.tier === 3;
              return false;
            });
            const nonPriority = remaining.filter((q) => {
              if (arbiterResult.signal === 'PRIORITIZE_RED_FLAGS') return !q.is_red_flag;
              if (arbiterResult.signal === 'RESOLVE_AMBIGUITY') return q.tier !== 3;
              return true;
            });

            const reordered = [...activeQuestions.slice(0, nextIdx), ...priority, ...nonPriority];
            setQuestions(reordered);
            activeQuestions = reordered;
          } else if (arbiterResult.signal === 'RESOLVE_FRICTION') {
            console.log('[Assessment] RESOLVE_FRICTION signal received. Generating clarification.');
            const frictionContext = `SYSTEM: Contradiction detected: ${profile.clinical_friction_details}. Ask a question to clarify this.`;

            setIsTyping(true);
            try {
              const generatedText = await getGeminiResponse(frictionContext);
              const frictionQuestion: AssessmentQuestion = {
                id: `friction-${Date.now()}`,
                text: generatedText.trim(),
                type: 'text',
                tier: 3,
              };

              const updatedQuestions = [
                ...activeQuestions.slice(0, nextIdx),
                frictionQuestion,
                ...activeQuestions.slice(nextIdx),
              ];
              setQuestions(updatedQuestions);

              // Proactive resolution: Inject message immediately and return
              setMessages((prev) => [
                ...prev,
                {
                  id: `friction-msg-${Date.now()}`,
                  text: clarificationHeader + frictionQuestion.text,
                  sender: 'assistant',
                },
              ]);

              setCurrentQuestionIndex(nextIdx);
              setIsTyping(false);
              setProcessing(false);
              return;
            } catch (err) {
              console.error('[Assessment] Failed to generate friction resolution question:', err);
              // Fallback to reordering if generation fails
              const remaining = activeQuestions.slice(nextIdx);
              const priority = remaining.filter((q) => q.tier === 3);
              const nonPriority = remaining.filter((q) => q.tier !== 3);
              const reordered = [...activeQuestions.slice(0, nextIdx), ...priority, ...nonPriority];
              setQuestions(reordered);
              activeQuestions = reordered;
            }
          }

          // Recalculate end state as questions list may have changed
          effectiveIsAtEnd = nextIdx >= activeQuestions.length;

          // Handle Progress Reset / False Positive Safeguard
          if (arbiterResult.needs_reset) {
            console.log(
              '[Assessment] Resetting progress indicators due to false positive completeness check',
            );
            setMessages((prev) => [
              ...prev,
              {
                id: `system-reset-${Date.now()}`,
                text: "I need to double-check some of the information provided to ensure my guidance is safe and accurate. Let's look closer at your symptoms.",
                sender: 'assistant',
              },
            ]);
          }

          // SAFETY GATE: If plan is exhausted but we are NOT ready to terminate (due to ambiguity or score)
          // we MUST generate additional resolution questions instead of terminating.
          const currentExpansion = expansionCount;
          if (effectiveIsAtEnd && !canTerminate && currentExpansion < MAX_EXPANSIONS) {
            console.log(
              `[Assessment] Plan exhausted but safety criteria not met. Expansion ${currentExpansion + 1}/${MAX_EXPANSIONS}. Fetching more questions.`,
            );

            // Inject clarifying feedback to build trust during expansion
            setMessages((prev) => [
              ...prev,
              {
                id: `expansion-notice-${Date.now()}`,
                text: 'I need to clarify just a few more specific details to be sure about your safety...',
                sender: 'assistant',
              },
            ]);
            hasShownClarificationHeader.current = true; // Avoid double headers
            clarificationHeader = ''; // Clear for the next question bubble to avoid redundancy

            setIsTyping(true);

            const resolvedTag = isRecentResolvedRef.current ? `[RECENT_RESOLVED: ${resolvedKeywordRef.current}]` : '';
            console.log(`[DEBUG_EXPANSION] resolvedTag: "${resolvedTag}", Ref: ${isRecentResolvedRef.current}, Keyword: ${resolvedKeywordRef.current}`);
            const followUpPrompt = `${resolvedTag} The assessment for "${initialSymptom}" is incomplete or ambiguous. History: ${historyItems.map((h) => h.text).join('. ')}. Generate 3 specific follow-up questions to resolve clinical ambiguity and safety concerns. Return JSON format matching the original question schema.`;
            try {
              let accumulatedResponse = '';
              setStreamingText(''); // Initialize streaming bubble

              const stream = streamGeminiResponse(followUpPrompt);
              for await (const chunk of stream) {
                accumulatedResponse += chunk;
                setStreamingText((prev) => (prev || '') + chunk);
              }

              if (accumulatedResponse) {
                // Safety Check: Abort if emergency verification started during stream
                if (isVerifyingEmergencyRef.current) {
                  console.warn(
                    '[Assessment] Emergency verification triggered during expansion. Aborting question update.',
                  );
                  setStreamingText(null);
                  setIsTyping(false);
                  setProcessing(false);
                  return;
                }

                const jsonMatch = accumulatedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  const newQuestions = (parsed.questions || []).map((q: any, i: number) => ({
                    ...q,
                    id: `extra-${nextIdx}-${currentExpansion}-${i}`,
                    tier: 3,
                  }));

                  if (newQuestions.length > 0) {
                    const updatedQuestions = [...activeQuestions, ...newQuestions];
                    const nextQ = updatedQuestions[nextIdx];

                    // Commit finalized message
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `ai-extra-${nextIdx}-${currentExpansion}`,
                        text: clarificationHeader + nextQ.text,
                        sender: 'assistant',
                      },
                    ]);

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
            if (effectiveIsAtEnd && !canTerminate) {
              console.log(
                `[Assessment] Safety criteria not met (Readiness: ${effectiveReadiness}) but plan cannot be expanded further. Finalizing with conservative fallback.`,
              );
              setIsTyping(false);
              setAssessmentStage('review');
              setMessages((prev) => [
              ...prev,
              {
                id: 'finalizing-safety-fallback',
                text: 'I have gathered enough initial information to provide a safe recommendation.',
                sender: 'assistant',
              },
            ]);
            setTimeout(() => finalizeAssessment(newAnswers, nextHistory, profile), 1000);
            return;
          }

          // If we are continuing within the planned questions after Turn 4 check
          if (!effectiveIsAtEnd) {
            const nextQ = activeQuestions[nextIdx];
            const readinessScore = profile.triage_readiness_score || 0;

            // --- STREAMING BRIDGE FEATURE ---
            // If readiness exceeds 0.4, we trigger dynamic bridging for a more natural transition
            if (readinessScore > 0.4) {
              console.log(
                `[Assessment] Readiness > 0.4 (${readinessScore}). Triggering bridging logic.`,
              );
              setIsTyping(true);

              let accumulatedBridge = '';
              let isCancelled = false;

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => {
                  isCancelled = true;
                  reject(new Error('BRIDGE_TIMEOUT'));
                }, 2000),
              );

              const bridgePromise = (async () => {
                const prompt = BRIDGE_PROMPT.replace(
                  '{{conversationHistory}}',
                  historyItems.map((h) => `${h.role.toUpperCase()}: ${h.text}`).join('\n'),
                ).replace('{{nextQuestion}}', nextQ.text);

                setStreamingText('');
                const stream = streamGeminiResponse(prompt);
                for await (const chunk of stream) {
                  if (isCancelled) break;
                  accumulatedBridge += chunk;
                  setStreamingText((prev) => (prev || '') + chunk);
                }
                return accumulatedBridge;
              })();

              try {
                const finalBridge = (await Promise.race([bridgePromise, timeoutPromise])) as string;

                // Safety Check: Abort if emergency verification started during bridge
                if (isVerifyingEmergencyRef.current) {
                  console.warn(
                    '[Assessment] Emergency verification triggered during bridging. Aborting bridge update.',
                  );
                  return;
                }

                setMessages((prev) => [
                  ...prev,
                  {
                    id: `ai-${nextIdx}-bridged`,
                    text: clarificationHeader + finalBridge,
                    sender: 'assistant',
                  },
                ]);
              } catch (err) {
                console.warn(
                  `[Assessment] Bridging failed or timed out: ${err}. Falling back to static question.`,
                );
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `ai-${nextIdx}`,
                    text: clarificationHeader + nextQ.text,
                    sender: 'assistant',
                  },
                ]);
              } finally {
                setStreamingText(null);
                setCurrentQuestionIndex(nextIdx);
                setIsTyping(false);
                setProcessing(false);
              }
              return;
            }

            // Default behavior if readiness <= 0.4
            setIsTyping(true);
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: `ai-${nextIdx}`,
                  text: clarificationHeader + nextQ.text,
                  sender: 'assistant',
                },
              ]);
              setCurrentQuestionIndex(nextIdx);
              setIsTyping(false);
              setProcessing(false);
            }, 600);
            return;
          }
        } catch (e) {
          console.warn(
            '[Assessment] Arbiter consultation or follow-up failed, continuing planned path...',
            e,
          );
        }
      }

      if (!isAtEnd) {
        // Next Question (Fallback if Arbiter check fails or is skipped)
        setIsTyping(true);
        setTimeout(() => {
          const nextQ = questions[nextIdx];
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${nextIdx}`,
              text: nextQ.text,
              sender: 'assistant',
            },
          ]);
          setCurrentQuestionIndex(nextIdx);
          setIsTyping(false);
          setProcessing(false);
        }, 600);
        } else {
          // EXHAUSTED QUESTIONS -> Finalize
          setIsTyping(false);
          setAssessmentStage('review');
          setMessages((prev) => [
          ...prev,
          {
            id: 'finalizing',
            text: "Thank you. I'm now analyzing your responses to provide the best guidance...",
            sender: 'assistant',
          },
        ]);
        setTimeout(() => {
          finalizeAssessment(newAnswers, nextHistory);
        }, 1500);
      }
    } else {
      // Offline Flow Handling
      handleOfflineLogic(answer);
    }
  };

  const handleEmergencyVerification = (status: 'emergency' | 'recent' | 'denied') => {
    if (!emergencyVerificationData) return;

    const { keyword, answer, currentQ, safetyCheck } = emergencyVerificationData;

    if (status === 'emergency') {
      /**
       * PATHWAY: CURRENT EMERGENCY
       * User confirms a high-risk symptom (e.g. chest pain) is happening NOW.
       * Action: Immediate escalation to 911/Emergency recommendation, bypassing assessment.
       */
      console.log(`[Assessment] EMERGENCY CONFIRMED: ${keyword}. Escalating.`);
      dispatch(setHighRisk(true));
      navigation.replace('Recommendation', {
        assessmentData: {
          symptoms: initialSymptom || '',
          affectedSystems: safetyCheck.affectedSystems,
          answers: [
            ...Object.entries(answers).map(([k, v]) => ({ question: k, answer: v })),
            { question: currentQ.text, answer },
          ],
          extractedProfile: {
            age: null,
            duration: null,
            severity: null,
            progression: null,
            red_flag_denials: null,
            uncertainty_accepted: false,
            summary: `Emergency confirmed: ${keyword}. Keywords: ${safetyCheck.matchedKeywords.join(', ')}`,
          },
        },
      });
    } else {
      if (status === 'recent') {
        /**
         * PATHWAY: RECENTLY RESOLVED (TRANSIENT)
         * User reports a high-risk symptom occurred but has since stopped (e.g. TIA, Angina).
         * Logic: We MUST NOT skip assessment. Instead, we flag the state for the final 
         * recommendation engine to enforce a "Hospital Floor" safety protocol while 
         * continuing to gather context about the episode's duration and progression.
         */
        console.log(`[Assessment] RECENTLY RESOLVED: ${keyword}. Flagging and continuing.`);
        setIsRecentResolved(true);
        setResolvedKeyword(keyword);
        // Force Ref update for immediate closure access
        isRecentResolvedRef.current = true;
        resolvedKeywordRef.current = keyword;
      } else {
        /**
         * PATHWAY: NON-EMERGENCY
         * User denies the high-risk symptom entirely (e.g. "I have no chest pain").
         * Logic: Suppress the keyword to prevent re-triggering and resume standard flow.
         */
        console.log(
          `[Assessment] EMERGENCY DENIED: ${keyword}. Resuming flow and suppressing keyword.`,
        );
      }

      setSuppressedKeywords((prev) => [...prev, keyword]);
      setIsVerifyingEmergency(false);
      setEmergencyVerificationData(null);

      // Resume the flow by calling handleNext with the same answer but skipping emergency check
      // Use a small delay to ensure state updates (setIsVerifyingEmergency) are processed
      setTimeout(() => handleNext(answer, true), 100);
    }
  };

  const finalizeAssessment = async (
    finalAnswers: Record<string, string>,
    currentHistory: Message[],
    preExtractedProfile?: AssessmentProfile,
  ) => {
    console.log('[Assessment] Finalizing... Extracting Slots.');
    setAssessmentStage('generating');

    try {
      const profile =
        preExtractedProfile ||
        (await extractClinicalProfile(
          currentHistory.map((m) => ({
            role: m.sender,
            text: m.text,
          })),
        ));

      console.log('\n╔═══ FINAL PROFILE EXTRACTION ═══╗');
      console.log(JSON.stringify(profile, null, 2));
      console.log(`╚${'═'.repeat(32)}╝\n`);

      // Format for Recommendation Screen
      const formattedAnswers = fullPlan.map((q) => ({
        question: q.text,
        answer: finalAnswers[q.id] || 'Not answered',
      }));

      // Final transition message
      setMessages((prev) => [
        ...prev,
        {
          id: `finalize-${Date.now()}`,
          text: 'Thank you. I have a clear picture of your situation now. Given your symptoms, I have generated a specific care plan. Let me walk you through it.',
          sender: 'assistant',
        },
      ]);

      const resolvedFlag = isRecentResolved || profile.is_recent_resolved === true;
      const resolvedKeywordFinal = resolvedKeyword || profile.resolved_keyword;

      setTimeout(() => {
        navigation.replace('Recommendation', {
          assessmentData: {
            symptoms: initialSymptom || '',
            answers: formattedAnswers,
            extractedProfile: {
              ...profile,
              is_recent_resolved: resolvedFlag,
              resolved_keyword: resolvedKeywordFinal || undefined,
            },
          },
          isRecentResolved: resolvedFlag,
          resolvedKeyword: resolvedKeywordFinal || undefined,
        });
      }, 1500);
    } catch (_) {
      Alert.alert('Error', 'Could not process results. Please try again.');
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
        isOffline: true,
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
            answers: [
              {
                question: 'Offline Triage',
                answer: result.node.recommendation?.reasoning || 'Completed',
              },
            ],
            offlineRecommendation: result.node.recommendation,
          },
        });
      } else {
        const nextNode = result.node;
        setMessages((prev) => [
          ...prev,
          {
            id: nextNode.id,
            text: nextNode.text || '',
            sender: 'assistant',
            isOffline: true,
          },
        ]);
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

    Alert.alert('Restart Assessment?', 'Going back will restart the assessment. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
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
    if (!speechService.isAvailable)
      return Alert.alert('Not Available', 'Voice input not supported.');
    try {
      setIsRecording(true);
      await speechService.startListening(
        (text) => setInputText(text),
        (err) => {
          console.error(err);
          setIsRecording(false);
        },
        (vol) => setVolume(vol),
      );
    } catch (e) {
      setIsRecording(false);
    }
  };
  const stopRecording = async () => {
    setIsRecording(false);
    await speechService.stopListening();
  };

  // --- RENDER ---
  const renderMessage = (msg: Message) => {
    const isAssistant = msg.sender === 'assistant';
    return (
      <View
        key={msg.id}
        style={[styles.messageWrapper, isAssistant ? styles.assistantWrapper : styles.userWrapper]}
      >
        {isAssistant && (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={msg.isOffline ? 'shield-check' : 'robot'}
              size={18}
              color={theme.colors.primary}
            />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isAssistant ? styles.assistantBubble : styles.userBubble,
            { backgroundColor: isAssistant ? theme.colors.surface : theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isAssistant ? theme.colors.onSurface : theme.colors.onPrimary },
            ]}
          >
            {msg.text}
          </Text>
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
  const offlineOptions =
    isOfflineMode && currentOfflineNodeId ? triageFlow.nodes[currentOfflineNodeId]?.options : null;

  const totalQuestions = Math.max(questions.length, 1);
  const answeredCount = Math.min(currentQuestionIndex, totalQuestions);
  const questionProgress = totalQuestions > 0 ? answeredCount / totalQuestions : 0;

  const assessmentProgress = (() => {
    if (isOfflineMode) {
      return {
        value: 0.5,
        label: 'Emergency Check',
        color: theme.colors.primary,
      };
    }

    switch (assessmentStage) {
      case 'generating':
        return {
          value: 1,
          label: 'Generating recommendation...',
          color: '#2196F3',
        };
      case 'review':
        return {
          value: Math.max(questionProgress, 0.85),
          label: 'Reviewing your responses...',
          color: theme.colors.primary,
        };
      case 'follow_up':
        return {
          value: Math.max(questionProgress, 0.35),
          label: 'Follow-up questions...',
          color: theme.colors.primary,
        };
      case 'intake':
      default:
        return {
          value: Math.max(questionProgress, 0.1),
          label: 'Gathering initial symptoms...',
          color: theme.colors.primary,
        };
    }
  })();

  // Determine if current question has a "None" option and if it's mandatory
  const currentOptions =
    currentQuestion?.options || (currentQuestion ? parseRedFlags(currentQuestion.text) : []);
  const hasNoneOptionInCurrent = currentOptions.some((opt: any) => {
    if (typeof opt === 'string') return isNoneOption(opt);
    if (opt && typeof opt === 'object' && 'label' in opt) return isNoneOption((opt as any).label);
    if (opt && typeof opt === 'object' && 'items' in opt) {
      return (opt as any).items.some((i: any) =>
        isNoneOption(typeof i === 'string' ? i : i.id || i.label || ''),
      );
    }
    return false;
  });

  const isMandatory = currentQuestion
    ? currentQuestion.text.toLowerCase().includes('drink') ||
      currentQuestion.text.toLowerCase().includes('frequently') ||
      currentQuestion.text.toLowerCase().includes('how often') ||
      currentQuestion.text.toLowerCase().includes('how many')
    : false;

  const showNoneButton = hasNoneOptionInCurrent && !isMandatory && selectedRedFlags.length === 0;

  console.log(`[DEBUG_RENDER] isVerifyingEmergency: ${isVerifyingEmergency}`);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader title="Assessment" showBackButton onBackPress={handleBack} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <ProgressBar
          progress={assessmentProgress.value}
          label={assessmentProgress.label}
          color={assessmentProgress.color}
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
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.messageText, { color: theme.colors.onSurface }]}>
                {streamingText}
              </Text>
            </View>
          </View>
        )}
        {isTyping && !streamingText && (
          <View style={[styles.messageWrapper, styles.assistantWrapper]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="robot" size={18} color={theme.colors.primary} />
            </View>
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                { backgroundColor: theme.colors.surface, padding: 12 },
              ]}
            >
              <TypingIndicator />
            </View>
          </View>
        )}
        {isVerifyingEmergency && emergencyVerificationData && (
          <View style={[styles.messageWrapper, styles.assistantWrapper]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="alert" size={18} color={theme.colors.error} />
            </View>
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.error,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.messageText, { color: theme.colors.onSurface }]}>
                I noticed you mentioned{' '}
                <Text style={{ fontWeight: 'bold' }}>{emergencyVerificationData.keyword}</Text>. To
                be safe, is this happening to you right now, or are you describing a past
                event/concern?
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Animated.View
        style={[
          styles.inputSection,
          {
            marginBottom: keyboardHeight,
            backgroundColor: theme.colors.background,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        {isVerifyingEmergency ? (
          <View testID="emergency-verification-buttons" style={{ gap: 8 }}>
            <Button
              variant="primary"
              onPress={() => handleEmergencyVerification('emergency')}
              title="Yes, happening right now"
              buttonColor={theme.colors.error}
              textColor="white"
              style={{ width: '100%' }}
              accessibilityLabel="Yes, happening right now"
              accessibilityHint="Escalates to immediate emergency recommendation"
            />
            <Button
              variant="outline"
              onPress={() => handleEmergencyVerification('recent')}
              title="Happened recently but has stopped"
              style={{ width: '100%' }}
              accessibilityLabel="Happened recently but has stopped"
              accessibilityHint="Continues assessment but flags the symptom as high priority"
            />
            <Button
              variant="outline"
              onPress={() => handleEmergencyVerification('denied')}
              title="No, not experiencing this"
              style={{ width: '100%' }}
              accessibilityLabel="No, not experiencing this"
              accessibilityHint="Continues standard assessment"
            />
          </View>
        ) : isClarifyingDenial ? (
          <View style={{ gap: 8 }}>
            <Button
              variant="primary"
              onPress={() => handleNext('Yes, I am sure')}
              title="Yes, I am sure"
              style={{ width: '100%' }}
            />
            <Button
              variant="outline"
              onPress={() => handleNext('No, let me re-check')}
              title="No, let me re-check"
              style={{ width: '100%' }}
            />
          </View>
        ) : !isOfflineMode &&
          currentQuestion?.id === 'red_flags' &&
          symptomCategory === 'simple' &&
          !showRedFlagsChecklist &&
          !isClarifyingDenial ? (
          <View style={{ paddingBottom: 8, gap: 8 }}>
            <Text
              variant="titleSmall"
              style={{
                marginBottom: 8,
                paddingHorizontal: 16,
                letterSpacing: 1.5,
                fontWeight: '700',
                fontSize: 12,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              SAFETY CHECK
            </Text>
            <Text style={{ paddingHorizontal: 16, marginBottom: 8, color: theme.colors.onSurface }}>
              {`Just to be perfectly safe, since you told me about ${safetySymptomReference}, are you experiencing any other severe symptoms like difficulty breathing or chest pain, or is it still limited to ${safetyShortLabel}?`}
            </Text>
            <Button
              variant="primary"
              onPress={() => setShowRedFlagsChecklist(true)}
              title="Yes, I have other symptoms"
              style={{ width: '100%' }}
            />
            <Button
              variant="outline"
              onPress={() => handleNext(formatSelectionAnswer(currentQuestion, []))}
              title={`No, just ${safetyShortLabel}`}
              style={{ width: '100%' }}
            />
            <Button
              variant="outline"
              onPress={() => setShowRedFlagsChecklist(true)}
              title="I'm not sure / Maybe"
              style={{ width: '100%' }}
            />
          </View>
        ) : !isOfflineMode && currentQuestion && currentQuestion.type === 'multi-select' ? (
          <View style={{ paddingBottom: 8 }}>
            <Text
              variant="titleSmall"
              style={{
                marginBottom: 8,
                paddingHorizontal: 16,
                letterSpacing: 1.5,
                fontWeight: '700',
                fontSize: 12,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              SELECT ALL THAT APPLY
            </Text>
            <View style={{ maxHeight: SCREEN_HEIGHT / 3 }}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <MultiSelectChecklist
                  options={(() => {
                    const mapped = (
                      currentQuestion.options
                        ? currentQuestion.options.map((opt) => {
                            if (typeof opt === 'string') return { id: opt, label: opt };
                            return {
                              category: (opt as GroupedOption).category,
                              items: (opt as GroupedOption).items.map((i) => ({ id: i, label: i })),
                            };
                          })
                        : parseRedFlags(currentQuestion.text)
                    ) as any;

                    if (hasNoneOptionInCurrent && !isMandatory) {
                      return mapped
                        .map((opt: any) => {
                          if ('id' in opt) return isNoneOption(opt.id) ? null : opt;
                          return {
                            ...opt,
                            items: opt.items.filter((i: any) => !isNoneOption(i.id)),
                          };
                        })
                        .filter((opt: any) => {
                          if (!opt) return false;
                          if ('items' in opt) return opt.items.length > 0;
                          return true;
                        });
                    }
                    return mapped;
                  })()}
                  selectedIds={selectedRedFlags}
                  singleSelection={false}
                  onSelectionChange={(ids) => {
                    // Mutual exclusivity for "None" in Multi-Select
                    const lastAdded = ids.find((id) => !selectedRedFlags.includes(id));
                    if (lastAdded && isNoneOption(lastAdded)) {
                      setSelectedRedFlags([lastAdded]);
                    } else if (ids.length > 1 && ids.some((id) => isNoneOption(id))) {
                      setSelectedRedFlags(ids.filter((id) => !isNoneOption(id)));
                    } else {
                      setSelectedRedFlags(ids);
                    }
                  }}
                />
              </ScrollView>
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {showNoneButton ? (
                <Button
                  testID="button-none"
                  variant="outline"
                  onPress={() => {
                    handleNext(formatSelectionAnswer(currentQuestion, []));
                  }}
                  title="None of the above"
                  style={{ width: '100%' }}
                  disabled={processing}
                  accessibilityLabel="None of the above"
                  accessibilityRole="button"
                />
              ) : (
                <Button
                  testID="button-confirm"
                  variant="primary"
                  onPress={() => {
                    handleNext(formatSelectionAnswer(currentQuestion, selectedRedFlags));
                  }}
                  title="Confirm"
                  style={{ width: '100%' }}
                  disabled={processing || selectedRedFlags.length === 0}
                  accessibilityLabel="Confirm selection"
                  accessibilityRole="button"
                />
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Suggestions / Offline Chips */}
            {(() => {
              const shouldShowChips =
                offlineOptions ||
                (!isOfflineMode &&
                  currentQuestion?.options &&
                  currentQuestion.options.length > 0 &&
                  currentQuestion.type !== 'text' &&
                  currentQuestion.type !== 'number');

              if (!shouldShowChips) return null;

              return (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                >
                  {offlineOptions
                    ? offlineOptions.map((opt) => (
                        <Chip
                          key={opt.label}
                          onPress={() => handleNext(opt.label)}
                          disabled={processing}
                        >
                          {opt.label}
                        </Chip>
                      ))
                    : currentQuestion!.options!.map((opt, idx) => {
                        if (typeof opt === 'string') {
                          return (
                            <Chip
                              key={idx}
                              onPress={() => handleNext(opt)}
                              disabled={processing}
                              style={{ marginRight: 8 }}
                            >
                              {opt}
                            </Chip>
                          );
                        }
                        return null;
                      })}
                </ScrollView>
              );
            })()}

            <InputCard
              ref={inputCardRef}
              value={inputText}
              onChangeText={setInputText}
              onSubmit={() => handleNext()}
              label={isOfflineMode ? 'Select an option above' : 'Type your answer...'}
              keyboardType={currentQuestion?.type === 'number' ? 'numeric' : 'default'}
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, elevation: 1 },
  assistantBubble: { borderBottomLeftRadius: 4 },
  userBubble: { borderBottomRightRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  inputSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default SymptomAssessmentScreen;
