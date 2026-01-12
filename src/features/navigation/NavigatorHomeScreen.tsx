import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Chip, useTheme, ActivityIndicator, IconButton, Card } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { CheckStackScreenProps } from '../../types/navigation';
import { SlideToCall } from '../../components/common/SlideToCall';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setHasSeenDisclaimer } from '../../store/settingsSlice';
import { detectMentalHealthCrisis } from '../../services/mentalHealthDetector';

type NavigationProp = CheckStackScreenProps<'NavigatorHome'>['navigation'];

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Injury', 'Prenatal Care'];

const NavigatorHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const hasSeenDisclaimer = useAppSelector(state => state.settings.hasSeenDisclaimer);
  
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [symptom, setSymptom] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Adjusted keyboard offset to account for StandardHeader (60px) and status bar (insets.top)
  // Added a 20px buffer to lift it slightly more
  const headerHeight = 60;
  const keyboardVerticalOffset = headerHeight + insets.top + 20;

  // Animation for recording indicator
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        setSymptom(prev => prev + (prev ? ' ' : '') + "I have a severe headache and fever.");
        setIsProcessingAudio(false);
        setRecording(null);
      }, 1500);
    } catch (error) {
       console.error(error);
       setIsProcessingAudio(false);
       Alert.alert('Error', 'Failed to process audio.');
    }
  };

  const handleSubmit = () => {
    if (!symptom.trim()) return;

    // Check for mental health crisis
    const crisisCheck = detectMentalHealthCrisis(symptom);
    if (crisisCheck.isCrisis) {
      // @ts-ignore - CrisisSupport is added to navigator but TS might need full restart to pick up
      navigation.navigate('CrisisSupport');
      return;
    }

    navigation.navigate('SymptomAssessment', { initialSymptom: symptom });
  };

  const handleDisclaimerAccept = () => {
    dispatch(setHasSeenDisclaimer(true));
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      "Emergency Call",
      "This will initiate a call to emergency services (911). Do you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call 911", onPress: () => console.log("Calling 911..."), style: 'destructive' }
      ]
    );
  };

  const handleInputFocus = () => {
    // Extra scroll to ensure the input card is fully visible
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 120 : 140 }
          ]} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emergencyLayoutContainer}>
            <Card mode="contained" style={[styles.emergencyCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content style={styles.emergencyCardContent}>
                <View style={styles.emergencyTextContent}>
                  <Text variant="titleLarge" style={[styles.emergencyTitle, { color: theme.colors.onErrorContainer }]}>
                    Emergency?
                  </Text>
                  <Text variant="bodyMedium" style={[styles.emergencySubtitle, { color: theme.colors.onErrorContainer }]}>
                    Call 911 immediately if you need urgent care.
                  </Text>
                </View>
                <SlideToCall onSwipeComplete={handleEmergencyCall} label="Slide to call 911" />
              </Card.Content>
            </Card>
          </View>

          <View style={styles.heroSection}>
            <Text variant="headlineSmall" style={[styles.welcomeText, { color: theme.colors.onBackground }]}>
              How are you feeling today?
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Describe your symptoms and our AI will guide you to the right care.
            </Text>
          </View>

          {!hasSeenDisclaimer && (
            <View style={styles.disclaimerContainer}>
              <DisclaimerBanner visible={true} onAccept={handleDisclaimerAccept} />
            </View>
          )}

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

          <Card mode="outlined" style={styles.inputCard}>
            <Card.Content style={{ padding: 12 }}>
              <TextInput
                mode="outlined"
                label="Symptom Details"
                placeholder={isInputFocused ? "e.g., I have had a high fever for 2 days..." : ""}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={symptom}
                onChangeText={setSymptom}
                onFocus={() => {
                  setIsInputFocused(true);
                  handleInputFocus();
                }}
                onBlur={() => setIsInputFocused(false)}
                style={[styles.textInput, { backgroundColor: theme.colors.surface }]}
                outlineStyle={{ borderRadius: 12, borderWidth: 1.5 }}
                activeOutlineColor={theme.colors.primary}
                right={<TextInput.Affix text={`${symptom.length}/500`} />}
              />

              <View style={styles.actionRow}>
                <View style={styles.voiceActions}>
                  {isProcessingAudio ? (
                    <View style={styles.processingRow}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.micButtonRow}>
                      <View style={styles.micButtonContainer}>
                        {isRecording && (
                          <Animated.View
                            style={[styles.recordingPulse, { opacity: fadeAnim, backgroundColor: theme.colors.error }]}
                          />
                        )}
                        <IconButton
                          icon={isRecording ? 'stop' : 'microphone'}
                          mode="contained"
                          containerColor={isRecording ? theme.colors.error : theme.colors.primaryContainer}
                          iconColor={isRecording ? theme.colors.onError : theme.colors.onPrimaryContainer}
                          size={24}
                          onPress={isRecording ? stopRecording : startRecording}
                          accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                        />
                      </View>
                    </View>
                  )}
                </View>

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.inlineSubmitButton}
                  contentStyle={styles.inlineSubmitContent}
                  disabled={!symptom.trim() || isRecording || isProcessingAudio}
                  labelStyle={{ fontSize: 14 }}
                >
                  Start Assessment
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 60 },
  emergencyLayoutContainer: { marginBottom: 24 },
  emergencyCard: { borderRadius: 16, elevation: 0 },
  emergencyCardContent: { padding: 16 },
  emergencyTextContent: { marginBottom: 12 },
  emergencyTitle: { fontWeight: 'bold' },
  emergencySubtitle: { marginTop: 4 },
  heroSection: { marginBottom: 24 },
  welcomeText: { fontWeight: 'bold', textAlign: 'left' },
  subtitle: { marginTop: 8, lineHeight: 20 },
  disclaimerContainer: { marginBottom: 24 },
  inputCard: { padding: 0, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  textInput: { marginBottom: 4 },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 12,
  },
  voiceActions: { 
    flex: 0.15,
    justifyContent: 'center',
  },
  inlineSubmitButton: { 
    flex: 0.85,
    borderRadius: 12,
    marginLeft: 8,
  },
  inlineSubmitContent: {
    height: 44,
  },
  processingRow: { flexDirection: 'row', alignItems: 'center' },
  micButtonRow: { flexDirection: 'row', alignItems: 'center' },
  micButtonContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  recordingPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'absolute',
    opacity: 0.3,
  },
  quickActions: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, fontWeight: '700', letterSpacing: 0.5, fontSize: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
});

export default NavigatorHomeScreen;
