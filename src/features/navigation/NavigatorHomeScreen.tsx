import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Chip, useTheme, Card } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { CheckStackScreenProps } from '../../types/navigation';
import { SlideToCall } from '../../components/common/SlideToCall';
import { InputCard } from '../../components/common';
import { detectMentalHealthCrisis } from '../../services/mentalHealthDetector';

type NavigationProp = CheckStackScreenProps<'NavigatorHome'>['navigation'];

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Injury', 'Prenatal Care'];

const NavigatorHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [symptom, setSymptom] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to end when keyboard appears to ensure content is visible
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (recording) {
      return () => {
        recording.stopAndUnloadAsync();
      };
    }
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
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
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
        setSymptom((prev) => prev + (prev ? ' ' : '') + 'I have a severe headache and fever.');
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

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'This will initiate a call to emergency services (911). Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => console.log('Calling 911...'), style: 'destructive' },
      ],
    );
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 + insets.top : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (keyboardVisible) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        }}
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

      <View
        style={[
          styles.anchoredInputContainer,

          {
            paddingBottom: keyboardVisible ? 16 : Math.max(16, insets.bottom + 8),

            paddingLeft: Math.max(16, insets.left),

            paddingRight: Math.max(16, insets.right),

            backgroundColor: theme.colors.background,
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
          onFocus={handleInputFocus}
          onBlur={() => setIsInputFocused(false)}
          isRecording={isRecording}
          isProcessingAudio={isProcessingAudio}
          onVoicePress={isRecording ? stopRecording : startRecording}
        />
      </View>
    </KeyboardAvoidingView>
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
