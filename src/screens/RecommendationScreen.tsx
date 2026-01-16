import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Divider,
  Surface,
} from 'react-native-paper';
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
import { setHighRisk, setRecommendation as setReduxRecommendation } from '../store/navigationSlice';
import { saveClinicalNote } from '../store/offlineSlice';
import { geminiClient, AssessmentResponse } from '../api/geminiClient';
import { EmergencyButton } from '../components/common/EmergencyButton';
import { FacilityCard } from '../components/common/FacilityCard';
import { Button, SafetyRecheckModal } from '../components/common';
import { DoctorHandoverCard } from '../components/features/navigation/DoctorHandoverCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility } from '../types';
import { useUserLocation } from '../hooks';
import { fetchFacilities } from '../store/facilitiesSlice';
import StandardHeader from '../components/common/StandardHeader';
import { calculateDistance, scoreFacility, filterFacilitiesByServices } from '../utils';

import { AssessmentProfile } from '../types/triage';

type ScreenProps = RootStackScreenProps<'Recommendation'>;

const isFallbackProfile = (profile?: AssessmentProfile) => {
  if (!profile || !profile.summary) return false;
  // If age/duration etc are all null and summary contains dialogue tags, it's a fallback
  const isDataEmpty = !profile.age && !profile.duration && !profile.severity && !profile.progression;
  const hasDialogueTags = profile.summary.includes('USER:') || profile.summary.includes('ASSISTANT:');
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
  if (profile.red_flag_denials) parts.push(`Red Flags Denied: ${profile.red_flag_denials}`);
  if (profile.summary) parts.push(`Summary: ${profile.summary}`);
  return parts.join('. ');
};

const RecommendationScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Recommendation'>>();
  const navigation = useNavigation<ScreenProps['navigation']>();
  const theme = useTheme();
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
  const [showHandover, setShowHandover] = useState(false);
  const analysisStarted = useRef(false);

  const handleBack = useCallback(() => {
    Alert.alert(
      'Exit Recommendation',
      'Are you sure you want to exit? You will be returned to the AI Navigator start screen.',
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
                      routes: [{ name: 'NavigatorHome' }],
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <StandardHeader title="Recommendation" showBackButton onBackPress={handleBack} />
      ),
    });
  }, [navigation, handleBack]);

  const analyzeSymptoms = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate distances to nearest Health Center and Hospital
      let nearestHealthCenterDist = Infinity;
      let nearestHospitalDist = Infinity;

      facilities.forEach((f) => {
        const type = f.type?.toLowerCase() || '';
        // Use existing distance if available, otherwise calculate it if we have user location
        const dist =
          f.distance ??
          (userLocation
            ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                f.latitude,
                f.longitude,
              )
            : Infinity);

        if (dist === Infinity) return;

        if (type.includes('health') || type.includes('unit') || type.includes('center')) {
          if (dist < nearestHealthCenterDist) nearestHealthCenterDist = dist;
        }

        if (type.includes('hospital') || type.includes('infirmary') || type.includes('emergency')) {
          if (dist < nearestHospitalDist) nearestHospitalDist = dist;
        }
      });

      const hcDistStr =
        nearestHealthCenterDist !== Infinity
          ? `${nearestHealthCenterDist.toFixed(1)}km`
          : 'Unknown';
      const hospDistStr =
        nearestHospitalDist !== Infinity ? `${nearestHospitalDist.toFixed(1)}km` : 'Unknown';
      const distanceContext = `Nearest Health Center: ${hcDistStr}, Nearest Hospital: ${hospDistStr}`;

      const profile = assessmentData.extractedProfile;
      const isFallback = isFallbackProfile(profile);
      const profileSummary = formatClinicalSummary(profile);
      
      let triageContext = `Initial Symptom: ${assessmentData.symptoms}. ${
        profileSummary ? `Clinical Profile: ${profileSummary}. ` : ''
      }Answers: ${JSON.stringify(assessmentData.answers)}. Context: ${distanceContext}`;

      if (isFallback) {
        triageContext = `Analyze the following raw medical history directly as the structured extraction failed.\n\n${triageContext}`;
      }

      const response = await geminiClient.assessSymptoms(triageContext);
      setRecommendation(response);

      // Save to Redux for persistence and offline access
      dispatch(
        setReduxRecommendation({
          level: response.recommended_level,
          user_advice: response.user_advice,
          clinical_soap: response.clinical_soap,
        }),
      );

      if (response.clinical_soap) {
        dispatch(
          saveClinicalNote({
            clinical_soap: response.clinical_soap,
            recommendationLevel: response.recommended_level,
          }),
        );
      }

      // If emergency, set high risk status for persistence
      if (response.recommended_level === 'emergency') {
        dispatch(setHighRisk(true));
      }
    } catch (error) {
      console.error('Analysis Error:', error);
      // Fallback
      setRecommendation({
        recommended_level: 'health_center',
        user_advice: 'Based on your symptoms, we recommend a professional medical check-up at your local health center. Please follow DOH hydration protocols.',
        clinical_soap: 'S: Symptoms reported. O: N/A. A: Fallback triage. P: Refer to Health Center.',
        key_concerns: ['Persistent symptoms', 'Need for professional evaluation'],
        critical_warnings: ['Follow DOH hydration protocols: Drink 2L of fluids daily.'],
        relevant_services: ['Consultation'],
        red_flags: [],
        follow_up_questions: [],
        confidence_score: 0.5,
      });
    } finally {
      setLoading(false);
    }
  }, [assessmentData, facilities, userLocation, dispatch]);

  useEffect(() => {
    // Load facilities if they aren't in the store
    if (facilities.length === 0) {
      dispatch(fetchFacilities({ page: 1, refresh: true }));
    }
  }, [dispatch, facilities.length]);

  useEffect(() => {
    // Start analysis once facilities are loaded (or if they were already available)
    if (!analysisStarted.current && (!isFacilitiesLoading || facilities.length > 0)) {
      analysisStarted.current = true;
      analyzeSymptoms();
    }
  }, [facilities.length, isFacilitiesLoading, analyzeSymptoms]);

  useEffect(() => {
    if (recommendation && (facilities.length > 0 || !isFacilitiesLoading)) {
      filterFacilities();
    }
  }, [recommendation, facilities, isFacilitiesLoading]);

  const filterFacilities = () => {
    if (!recommendation) return;

    const targetLevel = recommendation.recommended_level;
    const requiredServices = recommendation.relevant_services || [];

    // 1. Get high-precision matches based on specialized services
    const precisionMatches = filterFacilitiesByServices(facilities, requiredServices);

    // 2. Get all facilities with general scoring (level + distance)
    const scoredFacilities = facilities
      .map((facility) => ({
        facility,
        score: scoreFacility(facility, targetLevel, requiredServices),
      }))
      .sort((a, b) => b.score - a.score);

    // 3. Combine them: Precision matches first, then fill remaining slots with highest general scores
    const precisionIds = new Set(precisionMatches.map((f) => f.id));
    const fillFacilities = scoredFacilities
      .filter((s) => !precisionIds.has(s.facility.id))
      .map((s) => s.facility);

    const finalRecommendations = [...precisionMatches, ...fillFacilities].slice(0, 3);

    setRecommendedFacilities(finalRecommendations);
  };

  const handleViewDetails = (facilityId: string) => {
    navigation.navigate('FacilityDetails', { facilityId });
  };

  const getCareLevelInfo = (level: string) => {
    switch (level) {
      case 'emergency':
        return {
          label: 'EMERGENCY ROOM',
          color: theme.colors.error,
          icon: 'alert-octagon',
          bgColor: '#FEF2F2',
          borderColor: '#FCA5A5',
        };
      case 'hospital':
        return {
          label: 'HOSPITAL',
          color: '#E67E22',
          icon: 'hospital-building',
          bgColor: '#FFF7ED',
          borderColor: '#FDBA74',
        };
      case 'health_center':
        return {
          label: 'HEALTH CENTER',
          color: theme.colors.primary,
          icon: 'hospital-marker',
          bgColor: '#F0F9F6',
          borderColor: '#A7F3D0',
        };
      case 'self_care':
        return {
          label: 'SELF CARE',
          color: '#10B981',
          icon: 'home-heart',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
        };
      default:
        return {
          label: level.toUpperCase(),
          color: theme.colors.primary,
          icon: 'hospital-building',
          bgColor: '#F0F9F6',
          borderColor: '#A7F3D0',
        };
    }
  };

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
  const careInfo = getCareLevelInfo(recommendation.recommended_level);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Banner */}
        {isEmergency && (
          <Surface
            style={[styles.emergencyBanner, { backgroundColor: theme.colors.error }]}
            elevation={2}
          >
            <View style={styles.emergencyHeader}>
              <MaterialCommunityIcons name="alert-octagon" size={40} color="white" />
              <View style={styles.emergencyTextContainer}>
                <Text style={styles.emergencyTitle}>URGENT CARE REQUIRED</Text>
                <Text style={styles.emergencySubtitle}>Seek medical help immediately</Text>
              </View>
            </View>
            <EmergencyButton
              onPress={() => setSafetyModalVisible(true)}
              style={styles.emergencyButton}
              buttonColor="white"
              textColor={theme.colors.error}
            />
          </Surface>
        )}

        {/* Recommendation Card */}
        <Card
          mode="outlined"
          style={[
            styles.card,
            {
              backgroundColor: careInfo.bgColor,
              borderColor: careInfo.borderColor,
              borderWidth: 1,
            },
          ]}
        >
          <Card.Content style={styles.cardHeader}>
            <Surface style={[styles.careBadge, { backgroundColor: 'white' }]} elevation={1}>
              <MaterialCommunityIcons
                name={careInfo.icon as keyof (typeof MaterialCommunityIcons)['glyphMap']}
                size={20}
                color={careInfo.color}
              />
              <Text variant="labelLarge" style={[styles.careLabel, { color: careInfo.color }]}>
                {careInfo.label}
              </Text>
            </Surface>
          </Card.Content>

          <Surface style={styles.adviceContainer} elevation={0}>
            <View style={styles.adviceHeader}>
              <MaterialCommunityIcons 
                name="heart-pulse" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={[styles.adviceTitle, { color: theme.colors.primary }]}>
                ASSESSMENT & ADVICE
              </Text>
            </View>
            <Text variant="bodyLarge" style={styles.adviceText}>
              {recommendation.user_advice}
            </Text>
          </Surface>

          {(recommendation.key_concerns.length > 0 ||
            recommendation.critical_warnings.length > 0) && (
            <View style={styles.warningContainer}>
              {recommendation.critical_warnings.length > 0 && (
                <View style={styles.warningSection}>
                  <Text
                    variant="labelMedium"
                    style={[styles.sectionLabel, { color: theme.colors.error }]}
                  >
                    RED FLAGS
                  </Text>
                  {recommendation.critical_warnings.map((warning, idx) => (
                    <View key={`warn-${idx}`} style={styles.warningRow}>
                      <MaterialCommunityIcons
                        name="alert-octagon"
                        size={20}
                        color={theme.colors.error}
                      />
                      <Text
                        variant="bodyMedium"
                        style={[styles.warningText, { color: theme.colors.error }]}
                      >
                        {warning}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {recommendation.key_concerns.length > 0 && (
                <View style={styles.concernsSection}>
                  <Text variant="labelMedium" style={styles.sectionLabel}>
                    KEY OBSERVATIONS
                  </Text>
                  <View style={styles.concernsList}>
                    {recommendation.key_concerns.map((concern, idx) => (
                      <View key={`concern-${idx}`} style={styles.concernRow}>
                        <MaterialCommunityIcons
                          name="information-outline"
                          size={16}
                          color="rgba(0,0,0,0.4)"
                          style={{ marginTop: 2 }}
                        />
                        <Text variant="bodyMedium" style={styles.concernText}>
                          {concern}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Facilities Section */}
        {recommendation.recommended_level !== 'self_care' && (
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

        {/* Clinical Handover Section */}
        {recommendation.clinical_soap && (
          <View style={styles.handoverSection}>
            <Divider style={styles.restartDivider} />
            <View style={styles.handoverHeader}>
              <MaterialCommunityIcons name="doctor" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.handoverTitle}>
                For Healthcare Professionals
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.handoverSubtitle}>
              If you are at the facility, you can show this clinical triage note to the nurse or doctor.
            </Text>
            <Button
              title={showHandover ? 'Hide Clinical Note' : 'Show Clinical Note'}
              onPress={() => setShowHandover(!showHandover)}
              variant="outline"
              icon={showHandover ? 'eye-off' : 'eye'}
              style={styles.handoverButton}
            />
            {showHandover && (
              <DoctorHandoverCard
                clinicalSoap={recommendation.clinical_soap}
                timestamp={Date.now()}
              />
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
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'Home' },
                    {
                      name: 'Check',
                      state: {
                        routes: [{ name: 'NavigatorHome' }],
                      },
                    },
                  ],
                }),
              )
            }
            variant="primary"
            style={styles.restartButton}
            icon="refresh"
          />
        </View>
      </ScrollView>

      <SafetyRecheckModal
        visible={safetyModalVisible}
        onDismiss={() => setSafetyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontWeight: '500' },
  content: { padding: 16, paddingVertical: 12, paddingBottom: 40 },

  emergencyBanner: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emergencyTextContainer: { flex: 1, marginLeft: 12 },
  emergencyTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
  emergencySubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  emergencyButton: { borderRadius: 12, marginVertical: 0 },

  card: { marginBottom: 32, borderRadius: 24, overflow: 'hidden' },
  cardHeader: { paddingTop: 16, paddingBottom: 4 },
  careBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  careLabel: { marginLeft: 8, fontWeight: '900', letterSpacing: 1, fontSize: 12 },

  section: { paddingVertical: 12 },
  sectionLabel: {
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  conditionText: {
    lineHeight: 24,
    fontWeight: '400',
    color: 'rgba(0,0,0,0.8)',
  },
  actionText: {
    lineHeight: 26,
    fontWeight: '700',
    fontSize: 17,
  },

  adviceContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#E8F5F1', // Soft Green/Blue background (primaryContainer)
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#379777', // Primary Green
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
  adviceText: {
    lineHeight: 26,
    color: '#2C3333',
    fontWeight: '500',
  },

  warningContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  warningSection: {
    padding: 16,
    paddingBottom: 8,
  },
  concernsSection: {
    padding: 16,
    paddingTop: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '800',
    lineHeight: 22,
  },
  concernsList: { paddingLeft: 0, marginTop: 4 },
  concernRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  concernText: {
    flex: 1,
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 20,
    marginLeft: 10,
    fontWeight: '500',
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
  handoverButton: {
    marginBottom: 16,
  },

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
});

export default RecommendationScreen;
