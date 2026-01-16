import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform, Keyboard, ScrollView, Animated, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Chip, useTheme, Card } from 'react-native-paper';
import { speechService } from '../../services/speechService';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { CheckStackScreenProps } from '../../types/navigation';
import { SlideToCall } from '../../components/common/SlideToCall';
import { InputCard, SafetyRecheckModal } from '../../components/common';
import { detectEmergency } from '../../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../../services/mentalHealthDetector';
import { setHighRisk } from '../../store/navigationSlice';

type NavigationProp = CheckStackScreenProps<'NavigatorHome'>['navigation'];

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Injury', 'Prenatal Care'];

let sessionSafetyCheckShown = false;

const NavigatorHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const [symptom, setSymptom] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

  useEffect(() => {
    // Show safety check modal once per session
    if (!sessionSafetyCheckShown) {
      setSafetyModalVisible(true);
      sessionSafetyCheckShown = true;
    }
  }, []);

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
    if (!symptom.trim()) return;

    // 1. Check for immediate Emergency
    const emergencyCheck = detectEmergency(symptom);
    if (emergencyCheck.isEmergency) {
      dispatch(setHighRisk(true));
      navigation.navigate('Recommendation', {
        assessmentData: { symptoms: symptom, answers: [] },
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

    navigation.navigate('SymptomAssessment', { initialSymptom: symptom });
  };

  const handleEmergencyCall = () => {
    dispatch(setHighRisk(true));
    const url = Platform.OS === 'android' ? 'tel:911' : 'telprompt:911';
    Linking.openURL(url).catch((err) => {
      console.error('Error opening dialer:', err);
      Alert.alert('Error', 'Could not initiate the call. Please dial 911 manually.');
    });
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
              mode="contained"
              style={[styles.emergencyCard, { backgroundColor: theme.colors.errorContainer }]}
            >
              <Card.Content style={styles.emergencyCardContent}>
                <View style={styles.emergencyTextContent}>
                  <Text
                    variant="titleLarge"
                    style={[styles.emergencyTitle, { color: theme.colors.onErrorContainer }]}
                  >
                    Emergency?
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={[styles.emergencySubtitle, { color: theme.colors.onErrorContainer }]}
                  >
                    Call 911 immediately if you need urgent care.
                  </Text>
                </View>

                <SlideToCall onSwipeComplete={handleEmergencyCall} label="Slide to call 911" />
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

          <View style={styles.quickActions}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Common Symptoms
            </Text>

            <View style={styles.chipContainer}>
              {QUICK_SYMPTOMS.map((s) => {
                let icon = 'medical-bag';

                if (s === 'Fever') icon = 'thermometer';

                if (s === 'Cough') icon = 'bacteria';

                if (s === 'Headache') icon = 'head-alert';

                if (s === 'Stomach Pain') icon = 'stomach';

                if (s === 'Injury') icon = 'bandage';

                return (
                  <Chip
                    key={s}
                    icon={icon}
                    onPress={() =>
                      setSymptom((prev) => {
                        const newText = prev ? `${prev}, ${s}` : s;

                        return newText.length > 500 ? prev : newText;
                      })
                    }
                    style={styles.chip}
                    mode="flat"
                    showSelectedOverlay
                  >
                    {s}
                  </Chip>
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
          label="Symptom Details"
          placeholder=""
          maxLength={500}
          isRecording={isRecording}
          volume={volume}
          onVoicePress={isRecording ? stopRecording : startRecording}
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
  anchoredInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  quickActions: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, fontWeight: '700', letterSpacing: 0.5, fontSize: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
});

export default NavigatorHomeScreen;
