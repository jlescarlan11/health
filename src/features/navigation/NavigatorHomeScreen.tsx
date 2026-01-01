import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Chip, useTheme, Surface, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { EmergencyButton } from '../../components/common/EmergencyButton';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AiChat'>;

const QUICK_SYMPTOMS = ['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Injury', 'Prenatal'];

const NavigatorHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  // #region agent log
  const insets = useSafeAreaInsets();
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'NavigatorHomeScreen.tsx:19', message: 'SafeAreaInsets measured', data: { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right, scrollPaddingVertical: 16, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' } }) }).catch(() => {});
  // #endregion
  const [symptom, setSymptom] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

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
    }
  };

  const handleSubmit = () => {
    if (!symptom.trim()) return;
    navigation.navigate('SymptomAssessment', { initialSymptom: symptom });
  };

  // #region agent log
  const containerStyle = styles.container;
  const scrollContentStyle = styles.scrollContent;
  const headerStyle = styles.header;
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'NavigatorHomeScreen.tsx:79', message: 'Style values before render', data: { scrollPaddingVertical: scrollContentStyle.paddingVertical, scrollPaddingHorizontal: scrollContentStyle.paddingHorizontal, headerMarginBottom: headerStyle.marginBottom, headerPaddingTop: headerStyle.paddingTop, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' } }) }).catch(() => {});
  // #endregion
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
       <ScrollView contentContainerStyle={styles.scrollContent}>
         <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.branding}>HEALTH Navigator</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>AI-Powered Health Assistant for Naga City</Text>
         </View>

         <DisclaimerBanner visible={showDisclaimer} onAccept={() => setShowDisclaimer(false)} />

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
                   <ActivityIndicator size="small" />
                   <Text style={{marginLeft: 8}}>Processing audio...</Text>
                </View>
             ) : (
                <Button
                  mode={isRecording ? 'contained' : 'outlined'}
                  onPress={isRecording ? stopRecording : startRecording}
                  icon={isRecording ? 'stop' : 'microphone'}
                  buttonColor={isRecording ? theme.colors.error : undefined}
                >
                  {isRecording ? 'Stop Recording' : 'Voice Input'}
                </Button>
             )}
           </View>
         </Surface>

         <View style={styles.quickActions}>
           <Text variant="titleMedium" style={styles.sectionTitle}>Common Symptoms</Text>
           <View style={styles.chipContainer}>
             {QUICK_SYMPTOMS.map(s => (
               <Chip 
                 key={s} 
                 onPress={() => setSymptom(prev => prev + (prev ? ', ' : '') + s)}
                 style={styles.chip}
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
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16 },
  header: { alignItems: 'center' },
  branding: { fontWeight: 'bold', color: '#1a73e8' },
  subtitle: { color: '#5f6368' },
  inputSection: { padding: 16, borderRadius: 12, backgroundColor: 'white', marginBottom: 20 },
  textInput: { backgroundColor: 'white', marginBottom: 12 },
  voiceContainer: { flexDirection: 'row', justifyContent: 'center' },
  processingRow: { flexDirection: 'row', alignItems: 'center' },
  quickActions: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12, fontWeight: '600' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 8 },
  submitButton: { paddingVertical: 6 },
  fabContainer: { position: 'absolute', right: 16, bottom: 16 },
});

export default NavigatorHomeScreen;