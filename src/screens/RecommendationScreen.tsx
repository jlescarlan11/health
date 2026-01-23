import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { Text, useTheme, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  useNavigation,
  RouteProp,
  useFocusEffect,
  CommonActions,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { RootStackParamList, RootStackScreenProps } from '../types/navigation';
import { setHighRisk, setRecommendation as setReduxRecommendation, clearAssessmentState } from '../store/navigationSlice';
import { saveClinicalNote } from '../store/offlineSlice';
import { geminiClient } from '../api/geminiClient';
import { detectEmergency, COMBINATION_RISKS } from '../services/emergencyDetector';
import { FacilityCard } from '../components/common/FacilityCard';
import { Button, SafetyRecheckModal } from '../components/common';
import { Facility, AssessmentResponse } from '../types';
import { useUserLocation } from '../hooks';
import { fetchFacilities } from '../store/facilitiesSlice';
import StandardHeader from '../components/common/StandardHeader';
import { calculateDistance, scoreFacility, filterFacilitiesByServices } from '../utils';
import { AssessmentProfile, TriageLevel } from '../types/triage';
import { ConfidenceSignal } from '../components/features/navigation/ConfidenceSignal';
import { TriageStatusCard } from '../components/features/triage/TriageStatusCard';
import { OFFLINE_SELF_CARE_THRESHOLD } from '../constants/clinical';

type ScreenProps = RootStackScreenProps<'Recommendation'>;

const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  Cardiac: 'Keep patient calm and seated. Loosen tight clothing.',
  Respiratory: 'Help patient sit upright. Keep them calm.',
  Trauma: 'Apply firm pressure to bleeding. Do not move if neck injury suspected.',
  Neurological: 'Check breathing. Place in recovery position if unconscious.',
  Other: 'Keep patient comfortable. Monitor breathing.',
};

const isFallbackProfile = (profile?: AssessmentProfile) => {
  if (!profile || !profile.summary) return false;
  // If age/duration etc are all null and summary contains dialogue tags, it's a fallback
  const isDataEmpty =
    !profile.age && !profile.duration && !profile.severity && !profile.progression;
  const hasDialogueTags =
    profile.summary.includes('USER:') || profile.summary.includes('ASSISTANT:');
  return isDataEmpty && hasDialogueTags;
};

const formatClinicalSummary = (profile?: AssessmentProfile) => {
  if (!profile) return '';

  if (isFallbackProfile(profile)) {
    return profile.summary; // Return raw history for direct analysis
  }

  const parts = [];
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.duration) parts.push(`Duration: ${profile.duration}`);
  if (profile.severity) parts.push(`Severity: ${profile.severity}`);
  if (profile.progression) parts.push(`Progression: ${profile.progression}`);
  if (profile.red_flag_denials) parts.push(`Red Flag Status: ${profile.red_flag_denials}`);
  if (profile.summary) parts.push(`Summary: ${profile.summary}`);

  return parts.join('. ');
};

const mapCareLevelToTriageLevel = (
  level: AssessmentResponse['recommended_level'],
): TriageLevel => {
  if (level === 'self_care') return 'self-care';
  if (level === 'health_center') return 'health-center';
  return level;
};

const applyOpacity = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const parsed = parseInt(sanitized, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MAX_SYMPTOM_SUMMARY_LENGTH = 120;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

// Prefer ending summaries at a natural word break instead of cutting mid-word.
const truncateToWordBoundary = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  const truncated = value.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeSlice =
    lastSpace > Math.floor(limit / 2) ? truncated.slice(0, lastSpace) : truncated;
  return safeSlice.trim().replace(/[.,;:!?]+$/, '');
};

const appendEllipsisIfNeeded = (text: string, wasTruncated: boolean) => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (!wasTruncated) return trimmed;
  const withoutPunctuation = trimmed.replace(/[.,;:!?]+$/, '').trim();
  return withoutPunctuation ? `${withoutPunctuation}...` : '...';
};

// Create a short, human-readable view of the initial report for safety UI.
const summarizeInitialSymptom = (symptom?: string) => {
  const normalized = collapseWhitespace(symptom ?? '');
  if (!normalized) return '';
  if (normalized.length <= MAX_SYMPTOM_SUMMARY_LENGTH) {
    return normalized;
  }

  const sentences =
    normalized
      .match(/[^.!?]+[.!?]*/g)
      ?.map((segment) => segment.trim())
      .filter(Boolean) || [];
  const candidate = sentences.length
    ? sentences[0].length <= MAX_SYMPTOM_SUMMARY_LENGTH
      ? sentences[0]
      : truncateToWordBoundary(sentences[0], MAX_SYMPTOM_SUMMARY_LENGTH)
    : truncateToWordBoundary(normalized, MAX_SYMPTOM_SUMMARY_LENGTH);

  const wasTruncated = normalized.length > candidate.length;
  return appendEllipsisIfNeeded(candidate, wasTruncated);
};

const RecommendationScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Recommendation'>>();
  const navigation = useNavigation<ScreenProps['navigation']>();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useDispatch<AppDispatch>();

  // Try to get location to improve sorting
  useUserLocation({ watch: false });

  const { assessmentData } = route.params;
  const {
    facilities,
    isLoading: isFacilitiesLoading,
    userLocation,
  } = useSelector((state: RootState) => state.facilities);

  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<AssessmentResponse | null>(null);
  const [recommendedFacilities, setRecommendedFacilities] = useState<Facility[]>([]);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const level = recommendation
    ? mapCareLevelToTriageLevel(recommendation.recommended_level)
    : 'self-care';
  const [showFacilities, setShowFacilities] = useState<boolean>(level !== 'self-care');
  const handleEmergencyAction = useCallback(() => setSafetyModalVisible(true), [setSafetyModalVisible]);

  const missingFields = useMemo(() => {
    if (!recommendation?.is_conservative_fallback) return [];

    const profile = assessmentData.extractedProfile;
    const missing: string[] = [];

    if (!profile?.age) missing.push('Age');
    if (!profile?.duration) missing.push('Duration');
    if (!profile?.severity) missing.push('Severity');

    return missing;
  }, [recommendation?.is_conservative_fallback, assessmentData.extractedProfile]);

  const initialSymptomSummary = useMemo(
    () => summarizeInitialSymptom(assessmentData.symptoms),
    [assessmentData.symptoms],
  );

  // Refs for stabilizing analyzeSymptoms dependencies
  const symptomsRef = useRef(assessmentData.symptoms);
  const answersRef = useRef(assessmentData.answers);
  const profileRef = useRef(assessmentData.extractedProfile);

  // Update refs when data changes
  useEffect(() => {
    symptomsRef.current = assessmentData.symptoms;
    answersRef.current = assessmentData.answers;
    profileRef.current = assessmentData.extractedProfile;
  }, [assessmentData]);

  const handleBack = useCallback(() => {
    Alert.alert(
      'Exit Recommendation',
      'Are you sure you want to exit? You will be returned to the Check Symptom start screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          onPress: () =>
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  { name: 'Home' },
                  {
                    name: 'Check',
                    state: {
                      routes: [{ name: 'CheckSymptom' }],
                    },
                  },
                ],
              }),
            ),
          style: 'destructive',
        },
      ],
    );
    return true; // Prevent default behavior
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return handleBack();
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [handleBack]),
  );

  useEffect(() => {
    setShowFacilities(level !== 'self-care');
  }, [level]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <StandardHeader title="Recommendation" showBackButton onBackPress={handleBack} />
      ),
    });
  }, [navigation, handleBack]);

  // Ensure all facilities have distances calculated once
  const facilitiesWithDistance = useMemo(() => {
    if (!userLocation) return facilities;

    return facilities.map((f) => ({
      ...f,
      distance:
        f.distance ??
        calculateDistance(userLocation.latitude, userLocation.longitude, f.latitude, f.longitude),
    }));
  }, [facilities, userLocation]);

  // Memoize nearest distances calculation
  const nearestDistances = useMemo(() => {
    let nearestHealthCenterDist = Infinity;
    let nearestHospitalDist = Infinity;

    facilitiesWithDistance.forEach((f) => {
      const type = f.type?.toLowerCase() || '';
      const dist = f.distance ?? Infinity;

      if (dist === Infinity) return;

      if (type.includes('health') || type.includes('unit') || type.includes('center')) {
        if (dist < nearestHealthCenterDist) nearestHealthCenterDist = dist;
      }

      if (type.includes('hospital') || type.includes('infirmary') || type.includes('emergency')) {
        if (dist < nearestHospitalDist) nearestHospitalDist = dist;
      }
    });

    return { nearestHealthCenterDist, nearestHospitalDist };
  }, [facilitiesWithDistance]);

  const analyzeSymptoms = useCallback(async () => {
    try {
      setLoading(true);

      const hcDistStr =
        nearestDistances.nearestHealthCenterDist !== Infinity
          ? `${nearestDistances.nearestHealthCenterDist.toFixed(1)}km`
          : 'Unknown';
      const hospDistStr =
        nearestDistances.nearestHospitalDist !== Infinity
          ? `${nearestDistances.nearestHospitalDist.toFixed(1)}km`
          : 'Unknown';
      const distanceContext = `Nearest Health Center: ${hcDistStr}, Nearest Hospital: ${hospDistStr}`;

      const profile = profileRef.current;
      const isFallback = isFallbackProfile(profile);
      const profileSummary = formatClinicalSummary(profile);

      // Add Recent Resolved tag if applicable
      const resolvedTag = profile?.is_recent_resolved
        ? `[RECENT_RESOLVED: ${profile.resolved_keyword || 'Unknown symptom'}]`
        : '';

      // Extract user answers once for reuse
      const userAnswersOnly = answersRef.current
        .map((a) => a.answer)
        .filter(
          (a) =>
            a && !['denied', 'none', 'wala', 'hindi', 'not answered'].includes(a.toLowerCase()),
        )
        .join('. ');

      // Clinical Context for LLM - Optimized to use summary as primary source
      const triageContextParts = [
        resolvedTag,
        `Initial Symptom: ${symptomsRef.current}.`,
        `Clinical Profile Summary: ${profileSummary}.`,
        `\nContext: ${distanceContext}`,
      ].filter(Boolean);

      // Only include full answers if profile is missing, fallback, or readiness is low
      if (
        !profile ||
        isFallback ||
        (profile?.triage_readiness_score !== undefined && profile.triage_readiness_score < 0.7)
      ) {
        triageContextParts.push(
          `\nRaw History for analysis: ${JSON.stringify(answersRef.current)}`,
        );
      }

      const triageContext = triageContextParts.join('\n');

      // **Safety Context for local scan (User-only content)**
      const safetyContext = `Initial Symptom: ${symptomsRef.current}. Answers: ${userAnswersOnly}.`;

      const response = await geminiClient.assessSymptoms(triageContext, [], safetyContext, profile);
      setRecommendation(response);

      // Save to Redux for persistence and offline access
      dispatch(
        setReduxRecommendation({
          level: response.recommended_level,
          user_advice: response.user_advice,
          clinical_soap: response.clinical_soap,
          isFallbackApplied: response.is_conservative_fallback,
          clinicalFrictionDetails: response.clinical_friction_details,
          medical_justification: response.medical_justification,
        }),
      );

      if (response.clinical_soap) {
        dispatch(
          saveClinicalNote({
            clinical_soap: response.clinical_soap,
            recommendationLevel: response.recommended_level,
            medical_justification: response.medical_justification,
          }),
        );
      }

      // If emergency, set high risk status for persistence
      if (response.recommended_level === 'emergency') {
        dispatch(setHighRisk(true));
      }
    } catch (error) {
      console.error('Analysis Error:', error);

      // Context-aware Fallback using local emergencyDetector
      const userAnswersOnly = answersRef.current
        .map((a) => a.answer)
        .filter(
          (a) =>
            a && !['denied', 'none', 'wala', 'hindi', 'not answered'].includes(a.toLowerCase()),
        )
        .join('. ');

      const localAnalysisContext = `Initial Symptom: ${symptomsRef.current}. Answers: ${userAnswersOnly}.`;
      const localResult = detectEmergency(localAnalysisContext, {
        isUserInput: true,
        profile: profileRef.current,
      });

      // Strengthened Fallback: Check for specific high-risk combinations
      let specificRiskMatch = null;
      for (const risk of COMBINATION_RISKS) {
        if (risk.symptoms.every((s) => localResult.matchedKeywords.includes(s))) {
          specificRiskMatch = risk;
          break;
        }
      }

      const isHighRiskFallback = localResult.score >= 5 || !!specificRiskMatch;
      
      // Safety Guards for Self-Care eligibility
      const profile = profileRef.current;
      const isVulnerable = profile?.is_vulnerable === true;
      const hasMatchedKeywords = localResult.matchedKeywords.length > 0;
      
      // Determine fallback level based on score and safety constraints
      let fallbackLevel: TriageLevel;
      
      if (specificRiskMatch) {
        fallbackLevel = 'emergency';
      } else if (isHighRiskFallback) {
        fallbackLevel = 'hospital';
      } else if (
        localResult.score !== null && 
        localResult.score <= OFFLINE_SELF_CARE_THRESHOLD && 
        !isVulnerable && 
        !hasMatchedKeywords
      ) {
        // Only allow self-care if score is low, not vulnerable, and NO keywords matched at all
        fallbackLevel = 'self-care';
      } else {
        // Default to health center for ambiguous or mild cases that don't meet strict self-care criteria
        fallbackLevel = 'health-center';
      }

      let fallbackAdvice = '';

      if (specificRiskMatch) {
        fallbackAdvice = `CRITICAL: ${specificRiskMatch.reason} suspected based on symptoms (${specificRiskMatch.symptoms.join(' + ')}). Proceed to the nearest hospital emergency room immediately. (Note: Fallback care level determined by local safety analysis).`;
      } else if (isHighRiskFallback) {
        fallbackAdvice =
          'Based on the complexity or potential severity of your symptoms, we recommend a medical check-up at a Hospital. While no immediate life-threatening signs were definitively confirmed, professional diagnostics are advised. (Note: Fallback care level determined by local safety analysis).';
      } else if (fallbackLevel === 'self-care') {
        fallbackAdvice = 
          'Based on your reported symptoms and current offline status, your condition appears manageable at home. Please monitor for any worsening signs and consult a doctor if symptoms persist. (Note: Fallback care level determined by local safety analysis).';
      } else {
        fallbackAdvice =
          'Based on your reported symptoms, we suggest a professional evaluation at your local Health Center. This is the appropriate next step for non-emergency medical consultation and routine screening. (Note: Fallback care level determined by local safety analysis).';
      }

      const normalizedFallbackLevel = fallbackLevel.replace(/-/g, '_') as AssessmentResponse['recommended_level'];

      const fallbackResponse: AssessmentResponse = {
        recommended_level: normalizedFallbackLevel,
        user_advice: fallbackAdvice,
        clinical_soap: `S: ${localAnalysisContext}. O: N/A. A: Fallback triage (Score: ${localResult.score}).${specificRiskMatch ? ` Risk: ${specificRiskMatch.reason}` : ''} P: Refer to ${fallbackLevel === 'emergency' ? 'Emergency Room' : fallbackLevel === 'hospital' ? 'Hospital' : fallbackLevel === 'health-center' ? 'Health Center' : 'Home Management'}.`,
        key_concerns: [
          'Need for professional evaluation',
          ...localResult.matchedKeywords.map((k) => `Monitored: ${k}`),
        ],
        critical_warnings: [
          'Go to the Emergency Room IMMEDIATELY if you develop a stiff neck, confusion, or difficulty breathing.',
        ],
        relevant_services:
          fallbackLevel === 'emergency'
            ? ['Emergency', 'Laboratory']
            : isHighRiskFallback
              ? ['Laboratory', 'Consultation']
              : ['Consultation'],
        red_flags: localResult.matchedKeywords,
        follow_up_questions: [],
        triage_readiness_score: 0.5,
        is_conservative_fallback: true,
        triage_logic: {
          original_level: normalizedFallbackLevel,
          final_level: normalizedFallbackLevel,
          adjustments: [
            {
              from: normalizedFallbackLevel,
              to: normalizedFallbackLevel,
              rule: 'OFFLINE_FALLBACK',
              reason:
                specificRiskMatch?.reason ||
                'Offline emergency detector determined fallback level.',
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };

      setRecommendation(fallbackResponse);

      // Save fallback to Redux
      dispatch(
        setReduxRecommendation({
          level: fallbackResponse.recommended_level,
          user_advice: fallbackResponse.user_advice,
          clinical_soap: fallbackResponse.clinical_soap,
          isFallbackApplied: fallbackResponse.is_conservative_fallback,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [nearestDistances, dispatch]);

  useEffect(() => {
    // Load facilities if they aren't in the store
    if (facilities.length === 0) {
      dispatch(fetchFacilities({ page: 1, refresh: true }));
    }
  }, [dispatch, facilities.length]);

  useEffect(() => {
    // Start analysis once facilities are loaded (or if they were already available)
    if (!analysisCompleted && (!isFacilitiesLoading || facilities.length > 0)) {
      setAnalysisCompleted(true);
      analyzeSymptoms();
    }
  }, [facilities.length, isFacilitiesLoading, analysisCompleted, analyzeSymptoms]);

  const filterFacilities = useCallback(() => {
    if (!recommendation) return;

    const targetLevel = recommendation.recommended_level;
    const requiredServices = recommendation.relevant_services || [];

    // Single pass: score all facilities and separate precision matches
    const precisionMatches: { facility: Facility; score: number }[] = [];
    const otherFacilities: { facility: Facility; score: number }[] = [];

    facilitiesWithDistance.forEach((facility) => {
      const score = scoreFacility(facility, targetLevel, requiredServices);
      const isPrecision =
        requiredServices.length > 0 &&
        requiredServices.every((s) => facility.services?.includes(s));

      if (isPrecision) {
        precisionMatches.push({ facility, score });
      } else {
        otherFacilities.push({ facility, score });
      }
    });

    // Sort precision matches by score
    precisionMatches.sort((a, b) => b.score - a.score);

    const needed = Math.max(0, 3 - precisionMatches.length);
    const topOthers =
      needed > 0 ? otherFacilities.sort((a, b) => b.score - a.score).slice(0, needed) : [];

    setRecommendedFacilities([
      ...precisionMatches.slice(0, 3).map((s) => s.facility),
      ...topOthers.map((s) => s.facility),
    ]);
  }, [recommendation, facilitiesWithDistance]);

  useEffect(() => {
    if (recommendation && (facilitiesWithDistance.length > 0 || !isFacilitiesLoading)) {
      filterFacilities();
    }
  }, [recommendation, facilitiesWithDistance, isFacilitiesLoading, filterFacilities]);

  const handleViewDetails = (facilityId: string) => {
    navigation.navigate('FacilityDetails', { facilityId });
  };

  const getCareLevelInfo = useCallback((level: string) => {
    // Normalize level string to handle both hyphenated and underscored versions
    const normalizedLevel = level.toLowerCase().replace('-', '_');

    switch (normalizedLevel) {
      case 'emergency':
        return {
          label: 'EMERGENCY (LIFE-THREATENING)',
          color: theme.colors.error,
          icon: 'alert-decagram',
          bgColor: theme.colors.errorContainer,
          borderColor: theme.colors.error,
        };
      case 'hospital':
        return {
          label: 'HOSPITAL (SPECIALIZED CARE)',
          color: theme.colors.secondary,
          icon: 'hospital-building',
          bgColor: theme.colors.secondaryContainer,
          borderColor: theme.colors.secondary,
        };
      case 'health_center':
        return {
          label: 'HEALTH CENTER (PRIMARY CARE)',
          color: theme.colors.primary,
          icon: 'hospital-marker',
          bgColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
        };
      case 'self_care':
        return {
          label: 'SELF CARE (HOME)',
          color: theme.colors.tertiary,
          icon: 'home-heart',
          bgColor: theme.colors.tertiaryContainer,
          borderColor: theme.colors.tertiary,
        };
      default:
        return {
          label: level.toUpperCase().replace('_', ' '),
          color: theme.colors.primary,
          icon: 'hospital-building',
          bgColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
        };
    }
  }, [theme]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing symptoms...</Text>
      </View>
    );
  }

  if (!recommendation) return null;

  const isEmergency = recommendation.recommended_level === 'emergency';
  const triageLevel = mapCareLevelToTriageLevel(recommendation.recommended_level);
  const careInfo = getCareLevelInfo(recommendation.recommended_level);
  const displayAdvice = (() => {
    if (isEmergency && recommendation.medical_justification) {
      return (
        recommendation.user_advice
          .replace(
            /CRITICAL: Potential life-threatening condition detected( based on your symptoms)?\./,
            '',
          )
          .replace(/CRITICAL: High risk combination detected \(.*?\)\./, '')
          .replace('Your symptoms indicate a mental health crisis.', '')
          .trim() || 'Seek medical help immediately.'
      );
    }
    return recommendation.user_advice;
  })();
  const showEmergencyJustification =
    isEmergency && Boolean(recommendation.medical_justification);
  const showAssessmentContextSection =
    recommendation.is_conservative_fallback ||
    Boolean(assessmentData.extractedProfile?.clinical_friction_detected) ||
    showEmergencyJustification;

  const infoBoxBaseStyle = {
    padding: theme.spacing.md,
    borderRadius: theme.roundness ?? 8,
  };
  const infoBoxSpacingStyle = {
    marginTop: theme.spacing.lg,
  };
  const confidenceInfoBackground = applyOpacity(theme.colors.surfaceVariant, 0.4);
  const frictionInfoBackground = applyOpacity(theme.colors.primaryContainer, 0.2);
  const outlinedButtonBorderRadius = Math.min(
    Math.max(theme.roundness ?? 10, 8),
    12,
  );
  const handoverBorderRadius =
    (theme as { borderRadius?: { medium?: number } }).borderRadius?.medium ??
    outlinedButtonBorderRadius;
  const handoverButtonStyle = [
    styles.handoverButton,
    {
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: handoverBorderRadius,
      backgroundColor: 'transparent',
      alignSelf: 'stretch',
    },
  ];
  const handoverButtonContentStyle = {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  };
  const handoverButtonLabelText = 'View Handover Report';
  const renderHandoverIcon = ({ color }: { color: string }) => (
    <MaterialCommunityIcons
      name="file-document"
      size={22}
      color={color}
      style={{ marginRight: theme.spacing.sm ?? 8 }}
    />
  );
  const handoverButtonLabelStyle = {
    marginLeft: 0, // spacing already handled via icon margin
    color: theme.colors.primary,
  };
  const selfCareToggleStyle = {
    marginHorizontal: theme.spacing.large,
    marginTop: theme.spacing.large,
    marginBottom: theme.spacing.large,
  };
  const selfCareToggleContentStyle = {
    paddingVertical: theme.spacing.medium,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCardWrapper}>
          <TriageStatusCard
            level={triageLevel}
            instruction={displayAdvice}
            onEmergencyAction={isEmergency ? handleEmergencyAction : undefined}
          />
        </View>

        {!!recommendation.clinical_soap && (
          <View style={styles.handoverSection}>
            <Divider style={styles.restartDivider} />
            <View style={styles.handoverHeader}>
              <MaterialCommunityIcons name="doctor" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.handoverTitle}>
                For Healthcare Professionals
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.handoverSubtitle}>
              If you are at the facility, you can share this clinical handover report with the nurse
              or doctor.
            </Text>
            <Button
              title={handoverButtonLabelText}
              onPress={() => navigation.navigate('ClinicalNote')}
              variant="outline"
              icon={renderHandoverIcon}
              style={handoverButtonStyle}
              contentStyle={handoverButtonContentStyle}
              labelStyle={handoverButtonLabelStyle}
              accessibilityLabel="View clinical handover report"
              accessibilityHint="Opens detailed medical information for healthcare providers"
              accessibilityRole="button"
            />
          </View>
        )}

        {/* Assessment Context & Safety Details */}
        {showAssessmentContextSection && (
          <View style={styles.adviceSection}>
            <View style={styles.adviceHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color={theme.colors.primary} />
              <Text
                variant="titleMedium"
                style={[styles.adviceTitle, { color: theme.colors.primary }]}
              >
                ASSESSMENT CONTEXT
              </Text>
            </View>
            {recommendation.is_conservative_fallback && (
              <View
                style={[
                  infoBoxBaseStyle,
                  infoBoxSpacingStyle,
                  { backgroundColor: confidenceInfoBackground },
                ]}
              >
                <ConfidenceSignal
                  missingFields={missingFields}
                  isRecentResolved={assessmentData.extractedProfile?.is_recent_resolved}
                  triage_logic={recommendation.triage_logic}
                  style={{
                    backgroundColor: 'transparent',
                    padding: 0,
                    borderRadius: 0,
                    margin: 0,
                    elevation: 0,
                  }}
                />
              </View>
            )}
            {assessmentData.extractedProfile?.clinical_friction_detected && (
              <View
                style={[
                  infoBoxBaseStyle,
                  infoBoxSpacingStyle,
                  { backgroundColor: frictionInfoBackground },
                ]}
              >
                <View style={styles.frictionHeader}>
                  <MaterialCommunityIcons
                    name="alert-outline"
                    size={Math.round(20 * 0.75)}
                    color="#B07B01"
                  />
                  <Text style={[styles.frictionTitle, { color: '#B07B01' }]}>CLINICAL CONTEXT</Text>
                </View>
                <Text style={[styles.frictionText, { color: '#4E342E' }]}>
                  {assessmentData.extractedProfile.clinical_friction_details ||
                    'Contradictory symptoms detected.'}
                </Text>
              </View>
            )}
            {showEmergencyJustification && (
              <Surface
                style={[
                  styles.justificationContainer,
                  { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
                ]}
                elevation={0}
              >
                <View style={styles.justificationHeader}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#B91C1C" />
                  <Text style={[styles.justificationTitle, { color: '#B91C1C' }]}>
                    EMERGENCY JUSTIFICATION
                  </Text>
                </View>
                <Text style={[styles.justificationText, { color: '#7F1D1D' }]}>
                  {recommendation.medical_justification}
                </Text>
              </Surface>
            )}
          </View>
        )}

        {/* Critical Warnings Section - High Visibility (Moved & unwrapped for consistency) */}
        {recommendation.critical_warnings.length > 0 && (
          <View style={styles.criticalWarningsSection}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="alert" size={24} color={theme.colors.error} />
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.error }]}
              >
                CRITICAL ALERTS
              </Text>
            </View>
            <Text
              variant="bodySmall"
              style={[
                styles.sectionSubtitle,
                { color: theme.colors.error, marginTop: 4, marginBottom: 12 },
              ]}
            >
              Seek immediate care if any of these develop:
            </Text>
            {recommendation.critical_warnings.map((warning, idx) => (
              <View key={`warn-${idx}`} style={styles.warningRow}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={theme.colors.error}
                  style={{ marginTop: 2 }}
                />
                <Text
                  variant="bodyMedium"
                  style={[styles.warningText, { color: theme.colors.onSurface }]}
                >
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Key Observations Section - Neutral/Informational */}
        {recommendation.key_concerns.length > 0 && (
          <Surface style={styles.observationsContainer} elevation={0}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons
                name="clipboard-text-search-outline"
                size={22}
                color={theme.colors.secondary}
              />
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.secondary }]}
              >
                KEY OBSERVATIONS
              </Text>
            </View>
            <View style={styles.concernsList}>
              {recommendation.key_concerns.map((concern, idx) => (
                <View key={`concern-${idx}`} style={styles.concernRow}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={18}
                    color={theme.colors.secondary}
                    style={{ marginTop: 2 }}
                  />
                  <Text variant="bodyMedium" style={styles.concernText}>
                    {concern}
                  </Text>
                </View>
              ))}
            </View>
          </Surface>
        )}

        {level === 'self-care' && !showFacilities && (
          <Button
            title="Find Nearby Clinics (Optional)"
            variant="outline"
            onPress={() => setShowFacilities(true)}
            icon="map-marker-outline"
            accessibilityLabel="Find nearby clinics"
            accessibilityHint="Shows optional list of nearby healthcare facilities"
            style={selfCareToggleStyle}
            contentStyle={selfCareToggleContentStyle}
          />
        )}

        {/* Facilities Section */}
        {showFacilities && (
          <View style={styles.facilitiesSection}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionHeading}>
                {isEmergency ? 'Nearest Emergency Care' : 'Recommended Facilities'}
              </Text>
              <Text variant="bodySmall" style={styles.sectionSubtitle}>
                Filtered for {careInfo.label.toLowerCase()} services
              </Text>
            </View>

            {recommendedFacilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                showDistance={true}
                distance={facility.distance}
                onPress={() => handleViewDetails(facility.id)}
                relevantServices={recommendation.relevant_services}
                simplified={true}
              />
            ))}

            {recommendedFacilities.length === 0 && !isFacilitiesLoading && (
              <Surface style={styles.emptyState} elevation={0}>
                <MaterialCommunityIcons
                  name="map-marker-off"
                  size={48}
                  color={theme.colors.outline}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
                >
                  No facilities found nearby.
                </Text>
                <Button
                  variant="text"
                  onPress={() => dispatch(fetchFacilities({ page: 1, refresh: true }))}
                  title="Retry Loading"
                />
              </Surface>
            )}

            {isFacilitiesLoading && recommendedFacilities.length === 0 && (
              <ActivityIndicator style={{ marginTop: 20 }} />
            )}
          </View>
        )}

        {/* Restart Section */}
        <View style={styles.restartSection}>
          <Divider style={styles.restartDivider} />
          <Text
            variant="bodyMedium"
            style={[styles.restartText, { color: theme.colors.onSurfaceVariant }]}
          >
            Need to check other symptoms?
          </Text>
          <Button
            title="Start New Assessment"
            onPress={() => {
              dispatch(clearAssessmentState());
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'Home' },
                    {
                      name: 'Check',
                      state: {
                        routes: [{ name: 'CheckSymptom' }],
                      },
                    },
                  ],
                }),
              );
            }}
            variant="primary"
            style={styles.restartButton}
            icon="refresh"
          />
        </View>
      </ScrollView>

      <SafetyRecheckModal
        visible={safetyModalVisible}
        onDismiss={() => setSafetyModalVisible(false)}
        initialSymptomSummary={initialSymptomSummary}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontWeight: '500' },
  content: { padding: 16, paddingVertical: 12, paddingBottom: 40 },
  statusCardWrapper: {
    marginBottom: 16,
  },

  frictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  frictionTitle: {
    marginLeft: 8,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  frictionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  adviceSection: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceTitle: {
    marginLeft: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  justificationContainer: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  justificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  justificationTitle: {
    marginLeft: 8,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  justificationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  criticalWarningsSection: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  observationsContainer: {
    marginBottom: 24,
    backgroundColor: '#F5F7F8',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '600',
    lineHeight: 22,
  },
  concernsList: { paddingLeft: 0, marginTop: 8 },
  concernRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  concernText: {
    flex: 1,
    color: '#45474B',
    lineHeight: 20,
    marginLeft: 10,
    fontWeight: '400',
  },

  facilitiesSection: { marginBottom: 24 },
  sectionHeader: { marginBottom: 16 },
  sectionHeading: { fontWeight: '800', fontSize: 22, color: '#333' },
  sectionSubtitle: { color: '#666', marginTop: 2, fontSize: 13 },

  handoverSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  handoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  handoverTitle: {
    marginLeft: 12,
    fontWeight: 'bold',
  },
  handoverSubtitle: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  handoverButton: {},

  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },

  restartSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  restartDivider: {
    width: '100%',
    marginBottom: 24,
  },
  restartText: {
    marginBottom: 16,
    fontWeight: '600',
  },
  restartButton: {
    width: '100%',
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RecommendationScreen;
