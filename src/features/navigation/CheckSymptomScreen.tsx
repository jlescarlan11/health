import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Chip, useTheme, Card, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { speechService } from '../../services/speechService';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { CheckStackScreenProps } from '../../types/navigation';
import { RootState } from '../../store';
import { InputCard, EmergencyActions } from '../../components/common';
import { detectEmergency } from '../../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../../services/mentalHealthDetector';
import { setHighRisk, clearAssessmentState, setSymptomDraft } from '../../store/navigationSlice';

type NavigationProp = CheckStackScreenProps<'CheckSymptom'>['navigation'];

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Prenatal Care', 'Injury'];

const SYMPTOM_ICONS: Record<string, string> = {
  Fever: 'thermometer',
  Cough: 'bacteria',
  Headache: 'head-alert',
  'Stomach Pain': 'stomach',
  Injury: 'bandage',
  'Prenatal Care': 'medical-bag',
};

const SymptomItem = ({
  label,
  icon,
  isSelected,
  onPress,
}: {
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const theme = useTheme();

  return (
    <Chip
      selected={isSelected}
      onPress={onPress}
      mode="flat"
      showSelectedCheck={false}
      icon={({ size, color }) => (
        <MaterialCommunityIcons
          name={(isSelected ? 'check' : icon) as any}
          size={size}
          color={isSelected ? theme.colors.onPrimary : theme.colors.primary}
        />
      )}
      style={[
        styles.symptomChip,
        {
          backgroundColor: isSelected ? theme.colors.primary : theme.colors.secondaryContainer,
        },
      ]}
      textStyle={[
        styles.symptomLabel,
        { color: isSelected ? theme.colors.onPrimary : theme.colors.primary },
      ]}
    >
      {label}
    </Chip>
  );
};

const CheckSymptomScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const savedDraft = useSelector((state: RootState) => state.navigation.symptomDraft);
  const assessmentState = useSelector((state: RootState) => state.navigation.assessmentState);
  const theme = useTheme();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeightRef = useRef(new Animated.Value(0));
  const keyboardHeight = keyboardHeightRef.current;

  const [symptom, setSymptom] = useState(savedDraft || '');
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Persist draft to Redux
  useEffect(() => {
    dispatch(setSymptomDraft(symptom));
  }, [symptom, dispatch]);

  // Handle Assessment Redirection
  useEffect(() => {
    if (assessmentState && !isProcessing) {
      // If there is an ongoing assessment, we might want to redirect
      // But let's allow the user to start a new one if they want by typing
    }
  }, [assessmentState]);

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
      speechService.stopListening();
    };
  }, [keyboardHeight]);

  const toggleSymptom = (currentSymptom: string) => {
    setSymptom((prev) => {
      // Normalize string: split by comma, trim whitespace, filter empty
      const symptoms = prev
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const index = symptoms.indexOf(currentSymptom);

      if (index > -1) {
        // Remove symptom
        symptoms.splice(index, 1);
      } else {
        // Add symptom
        symptoms.push(currentSymptom);
      }

      const newSymptom = symptoms.join(', ');
      if (newSymptom.length > 500) return prev; // Length check
      return newSymptom;
    });
  };

  const startRecording = async () => {
    if (!speechService.isAvailable) {
      Alert.alert(
        'Voice Unavailable',
        'Voice recognition is not available on this device/simulator. Please type your symptoms.',
      );
      return;
    }

    try {
      setIsRecording(true);
      setVolume(0);
      await speechService.startListening(
        (text) => {
          setSymptom(text);
        },
        (error: any) => {
          console.error('STT Error:', error);
          setIsRecording(false);
          setVolume(0);
          Alert.alert(
            'Speech Error',
            error?.message || 'Could not recognize speech. Please try again.',
          );
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

  const handleSubmit = () => {
    if (!symptom.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      // 1. Check for immediate Emergency
      const emergencyCheck = detectEmergency(symptom, {
        isUserInput: true,
        historyContext: `Initial report: ${symptom}`,
        questionId: 'initial_symptom',
      });
      if (emergencyCheck.isEmergency) {
        dispatch(setHighRisk(true));
        navigation.navigate('Recommendation', {
          assessmentData: {
            symptoms: symptom,
            affectedSystems: emergencyCheck.affectedSystems,
            answers: [],
            extractedProfile: {
              age: null,
              duration: null,
              severity: 'Critical',
              progression: 'Sudden',
              red_flag_denials: null,
              summary: `Immediate emergency detected: ${symptom}. Matched keywords: ${emergencyCheck.matchedKeywords.join(', ')}`,
              red_flags_resolved: false,
              triage_readiness_score: 1.0,
            },
          },
        });
        return;
      }

      // 2. Check for mental health crisis
      const crisisCheck = detectMentalHealthCrisis(symptom);
      if (crisisCheck.isCrisis) {
        dispatch(setHighRisk(true));
        navigation.navigate('CrisisSupport');
        return;
      }

      dispatch(clearAssessmentState());
      navigation.navigate('SymptomAssessment', { initialSymptom: symptom });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <View style={styles.emergencyLayoutContainer}>
            <Card
              mode="elevated"
              style={[
                styles.emergencyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderWidth: 0.5,
                  borderColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
            >
              <Card.Content style={styles.emergencyCardContent}>
                <View style={styles.emergencyTextContent}>
                  <Text
                    variant="titleLarge"
                    style={[styles.emergencyTitle, { color: theme.colors.error }]}
                  >
                    Emergency?
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={[styles.emergencySubtitle, { color: theme.colors.onSurfaceVariant }]}
                  >
                    Contact emergency services immediately if you need urgent care.
                  </Text>
                </View>

                <EmergencyActions
                  onCallInitiated={() => dispatch(setHighRisk(true))}
                  variant="light"
                />
              </Card.Content>
            </Card>
          </View>

          <View style={styles.heroSection}>
            <Text
              variant="headlineSmall"
              style={[styles.welcomeText, { color: theme.colors.onBackground }]}
            >
              How are you feeling today?
            </Text>

            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Describe your symptoms and our AI will guide you to the right care.
            </Text>
          </View>

          {assessmentState && (
            <Pressable
              onPress={() => navigation.navigate('SymptomAssessment', { initialSymptom: assessmentState.initialSymptom })}
              style={({ pressed }) => [
                styles.resumeBanner,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.resumeContent}>
                <MaterialCommunityIcons name="play-circle-outline" size={24} color={theme.colors.primary} />
                <View style={styles.resumeTextContainer}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                    Ongoing Assessment
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                    Continue your assessment for "{assessmentState.initialSymptom}"
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
              </View>
            </Pressable>
          )}

          <View style={styles.quickActions}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Common Symptoms
            </Text>

            <View style={styles.chipContainer}>
              {QUICK_SYMPTOMS.map((s) => {
                const icon = SYMPTOM_ICONS[s] || 'medical-bag';
                const isSelected = symptom
                  .split(',')
                  .map((item) => item.trim())
                  .includes(s);

                return (
                  <SymptomItem
                    key={s}
                    label={s}
                    icon={icon}
                    isSelected={isSelected}
                    onPress={() => toggleSymptom(s)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.anchoredInputContainer,
          {
            paddingBottom: Math.max(16, insets.bottom + 8),
            paddingLeft: Math.max(16, insets.left),
            paddingRight: Math.max(16, insets.right),
            backgroundColor: theme.colors.background,
            marginBottom: keyboardHeight,
          },
        ]}
      >
        <InputCard
          value={symptom}
          onChangeText={setSymptom}
          onSubmit={handleSubmit}
          label="Type your symptoms here"
          placeholder=""
          maxLength={500}
          isRecording={isRecording}
          volume={volume}
          onVoicePress={isRecording ? stopRecording : startRecording}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, paddingVertical: 24 },
  mainContent: { paddingHorizontal: 16 },
  emergencyLayoutContainer: { marginBottom: 24 },
  emergencyCard: { borderRadius: 16, elevation: 0 },
  emergencyCardContent: { padding: 16 },
  emergencyTextContent: { marginBottom: 12 },
  emergencyTitle: { fontWeight: 'bold' },
  emergencySubtitle: { marginTop: 4 },
  heroSection: { marginBottom: 24 },
  welcomeText: { fontWeight: 'bold', textAlign: 'left' },
  subtitle: { marginTop: 8, lineHeight: 20 },
  resumeBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.2)',
  },
  resumeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  anchoredInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  quickActions: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, fontWeight: '700', letterSpacing: 0.5, fontSize: 16 },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    marginBottom: 4,
    borderRadius: 8,
  },
  symptomLabel: {
    fontWeight: '500',
    fontSize: 14,
  },
});

export default CheckSymptomScreen;
