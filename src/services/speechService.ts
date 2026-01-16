import Voice, { SpeechResultsEvent, SpeechErrorEvent, SpeechVolumeChangeEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import { Platform, NativeModules } from 'react-native';
import { audioToText } from './gemini';

class SpeechService {
  private isListening = false;
  private voiceAvailable = false;

  constructor() {
    // Check if the native module is available
    // The @react-native-voice/voice library relies on NativeModules.Voice
    // This prevents "TypeError: Cannot read property 'startSpeech' of null" if the module is not linked
    this.voiceAvailable = !!NativeModules.Voice;

    if (this.voiceAvailable) {
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged.bind(this);
    } else {
      console.warn('Voice module is not available. Speech recognition will not work.');
    }
  }

  get isAvailable(): boolean {
    return this.voiceAvailable;
  }

  private onSpeechResultsCallback: ((text: string) => void) | null = null;
  private onSpeechErrorCallback: ((error: any) => void) | null = null;
  private onVolumeChangedCallback: ((volume: number) => void) | null = null;

  private onSpeechResults(e: SpeechResultsEvent) {
    if (e.value && e.value.length > 0) {
      this.onSpeechResultsCallback?.(e.value[0]);
    }
  }

  private onSpeechError(e: SpeechErrorEvent) {
    console.error('Speech Recognition Error:', e.error);
    this.onSpeechErrorCallback?.(e.error);
    this.isListening = false;
  }

  private onSpeechVolumeChanged(e: SpeechVolumeChangeEvent) {
    if (e.value !== undefined) {
      this.onVolumeChangedCallback?.(e.value);
    }
  }

  async startListening(
    onResult: (text: string) => void,
    onError?: (error: any) => void,
    onVolumeChange?: (volume: number) => void,
    language = 'en-US',
  ) {
    if (!this.voiceAvailable) {
      const error = new Error('Voice recognition is not available on this device or simulator.');
      console.warn(error.message);
      onError?.(error);
      return;
    }

    if (this.isListening) return;

    try {
      this.onSpeechResultsCallback = onResult;
      this.onSpeechErrorCallback = onError || null;
      this.onVolumeChangedCallback = onVolumeChange || null;
      await Voice.start(language);
      this.isListening = true;
    } catch (e) {
      console.error('Failed to start Voice:', e);
      onError?.(e);
    }
  }

  async stopListening() {
    if (!this.isListening || !this.voiceAvailable) return;

    try {
      await Voice.stop();
      this.isListening = false;
    } catch (e) {
      console.error('Failed to stop Voice:', e);
    }
  }

  async destroy() {
    if (!this.voiceAvailable) return;

    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch (e) {
      console.error('Failed to destroy Voice:', e);
    }
  }

  // Text-to-Speech (TTS)
  speak(text: string, options?: Speech.SpeechOptions) {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
      ...options,
    });
  }

  stopSpeaking() {
    Speech.stop();
  }

  isSpeaking() {
    return Speech.isSpeakingAsync();
  }

  /**
   * High-precision cloud-based transcription using Gemini.
   * Useful for complex symptoms where on-device STT might fail.
   * @param base64Audio Base64 encoded audio data
   * @param mimeType MIME type of the audio (e.g., 'audio/wav', 'audio/m4a')
   */
  async cloudTranscribe(base64Audio: string, mimeType: string) {
    return audioToText(base64Audio, mimeType);
  }
}

export const speechService = new SpeechService();
