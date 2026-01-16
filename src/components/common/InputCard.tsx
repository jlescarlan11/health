import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { TextInput, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { VoiceVisualizer } from './VoiceVisualizer';

interface InputCardProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  isRecording?: boolean;
  volume?: number;
  isProcessingAudio?: boolean;
  onVoicePress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export interface InputCardRef {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
}

export const InputCard = forwardRef<InputCardRef, InputCardProps>((props, ref) => {
  const {
    value,
    onChangeText,
    onSubmit,
    placeholder,
    label,
    onFocus,
    onBlur,
    maxLength,
    isRecording = false,
    volume = 0,
    isProcessingAudio = false,
    onVoicePress,
    containerStyle,
    disabled = false,
  } = props;

  const theme = useTheme();
  const inputRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    isFocused: () => inputRef.current?.isFocused() || false,
  }));

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.4,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0.1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.4,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      animation.start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, fadeAnim, scaleAnim]);

  const hasText = value.trim().length > 0;
  const showSend = hasText && !isRecording && !isProcessingAudio;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          mode="outlined"
          label={label}
          placeholder={placeholder}
          multiline
          maxLength={maxLength}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[styles.textInput, { backgroundColor: 'transparent' }]}
          contentStyle={styles.textContent}
          outlineStyle={[styles.outline, { borderColor: theme.colors.outline }]}
          cursorColor={theme.colors.primary}
          selectionColor={theme.colors.primary + '40'}
          dense
          disabled={disabled}
        />
      </View>

      <View style={styles.actionContainer}>
        {isProcessingAudio ? (
          <View
            style={[styles.iconButtonPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : showSend ? (
          <IconButton
            icon="send"
            size={24}
            iconColor={theme.colors.primary}
            onPress={onSubmit}
            style={[styles.sendButton, { backgroundColor: theme.colors.primaryContainer }]}
            disabled={disabled}
          />
        ) : (
          onVoicePress && (
            <View style={[styles.micContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
              {isRecording ? (
                <VoiceVisualizer volume={volume} isRecording={isRecording} />
              ) : null}
              <IconButton
                icon={isRecording ? 'stop' : 'microphone'}
                size={24}
                iconColor={isRecording ? theme.colors.error : theme.colors.onSurfaceVariant}
                onPress={onVoicePress}
                style={styles.iconButton}
                disabled={disabled}
              />
            </View>
          )
        )}
      </View>
    </View>
  );
});

InputCard.displayName = 'InputCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  textContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  outline: {
    borderRadius: 24,
    borderWidth: 1,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  iconButton: {
    margin: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sendButton: {
    margin: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconButtonPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  recordingPulse: {
    width: 34,
    height: 34,
    borderRadius: 17,
    position: 'absolute',
    opacity: 0.3,
  },
});
