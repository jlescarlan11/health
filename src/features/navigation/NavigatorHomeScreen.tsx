import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Chip, useTheme, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { CheckStackScreenProps } from '../../types/navigation';
import { EmergencyButton } from '../../components/common/EmergencyButton';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setHasSeenDisclaimer } from '../../store/settingsSlice';

type NavigationProp = CheckStackScreenProps<'NavigatorHome'>['navigation'];

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Injury', 'Prenatal Care'];

const NavigatorHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const hasSeenDisclaimer = useAppSelector(state => state.settings.hasSeenDisclaimer);
  
  // #region agent log
  const insets = useSafeAreaInsets();
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'NavigatorHomeScreen.tsx:19', message: 'NavigatorHomeScreen render', data: { hasSeenDisclaimer, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' } }) }).catch(() => {});
  // #endregion

  const [symptom, setSymptom] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
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
      animation?.stop();
    }
    return () => {
      animation?.stop();
    };
  }, [isRecording, fadeAnim]);

  useEffect(() => {
    return () => {
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
    navigation.navigate('SymptomAssessment', { initialSymptom: symptom });
  };

  const handleDisclaimerAccept = () => {
    dispatch(setHasSeenDisclaimer(true));
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
       <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
         <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.branding, { color: theme.colors.primary }]}>HEALTH Navigator</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>AI-Powered Health Assistant for Naga City</Text>
         </View>

         {!hasSeenDisclaimer && (
           <View style={styles.disclaimerContainer}>
             <DisclaimerBanner visible={true} onAccept={handleDisclaimerAccept} />
           </View>
         )}

         <Surface style={styles.inputSection} elevation={1}>
           <TextInput
             mode="outlined"
             label="Describe your symptoms"
             placeholder="e.g., I have had a high fever for 2 days..."
             multiline
             numberOfLines={4}
             maxLength={500}
             value={symptom}
             onChangeText={setSymptom}
             style={styles.textInput}
             right={<TextInput.Affix text={`${symptom.length}/500`} />}
           />
           
           <View style={styles.voiceContainer}>
             {isProcessingAudio ? (
                <View style={styles.processingRow}>
                   <ActivityIndicator size="small" color={theme.colors.primary} />
                   <Text style={{marginLeft: 8, color: theme.colors.secondary}}>Processing audio...</Text>
                </View>
             ) : (
               <View style={styles.micButtonContainer}>
                 {isRecording && (
                   <Animated.View style={[styles.recordingIndicator, { opacity: fadeAnim, backgroundColor: theme.colors.error }]} />
                 )}
                 <IconButton
                    icon={isRecording ? "stop" : "microphone"}
                    mode="contained"
                    containerColor={isRecording ? theme.colors.error : theme.colors.primaryContainer}
                    iconColor={isRecording ? theme.colors.onError : theme.colors.onPrimaryContainer}
                    size={28}
                    onPress={isRecording ? stopRecording : startRecording}
                    accessibilityLabel={isRecording ? "Stop Recording" : "Start Voice Input"}
                 />
                 {isRecording && <Text style={{ marginLeft: 8, color: theme.colors.error }}>Recording...</Text>}
               </View>
             )}
           </View>
         </Surface>

         <View style={styles.quickActions}>
           <Text variant="titleMedium" style={styles.sectionTitle}>Common Symptoms</Text>
           <View style={styles.chipContainer}>
             {QUICK_SYMPTOMS.map(s => (
               <Chip 
                 key={s} 
                 onPress={() => setSymptom(prev => {
                    const newText = prev ? `${prev}, ${s}` : s;
                    return newText.length > 500 ? prev : newText;
                 })}
                 style={styles.chip}
                 showSelectedOverlay
               >
                 {s}
               </Chip>
             ))}
           </View>
         </View>
         
         <Button 
            mode="contained" 
            onPress={handleSubmit} 
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 8 }}
            disabled={!symptom.trim()}
         >
           Start Assessment
         </Button>
       </ScrollView>

       <View style={styles.fabContainer}>
         <EmergencyButton onPress={() => Alert.alert('Emergency', 'Calling 911...')} />
       </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 20 },
  branding: { fontWeight: 'bold' },
  subtitle: { color: '#5f6368', marginTop: 4 },
  disclaimerContainer: { marginBottom: 16 },
  inputSection: { padding: 16, borderRadius: 12, backgroundColor: 'white', marginBottom: 24 },
  textInput: { backgroundColor: 'white', marginBottom: 16 },
  voiceContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48 },
  processingRow: { flexDirection: 'row', alignItems: 'center' },
  micButtonContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 1,
  },
  quickActions: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, fontWeight: '600' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  submitButton: { marginTop: 8 },
  fabContainer: { position: 'absolute', right: 16, bottom: 16 },
});

export default NavigatorHomeScreen;