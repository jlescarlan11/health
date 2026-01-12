import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { TextInput, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';

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
  isProcessingAudio?: boolean;
  onVoicePress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const InputCard: React.FC<InputCardProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  label,
  onFocus,
  onBlur,
  maxLength,
  isRecording = false,
  isProcessingAudio = false,
  onVoicePress,
  containerStyle,
  disabled = false,
}) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        ])
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
          mode="outlined"
          label={label}
          placeholder={placeholder}
          multiline
          maxLength={maxLength}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[
            styles.textInput,
            { backgroundColor: theme.colors.background },
          ]}
          contentStyle={styles.textContent}
          outlineStyle={[
            styles.outline,
            { borderColor: theme.colors.outlineVariant }
          ]}
          cursorColor={theme.colors.primary}
          selectionColor={theme.colors.primary + '40'}
          dense
          disabled={disabled}
        />
      </View>

      <View style={styles.actionContainer}>
        {isProcessingAudio ? (
          <View style={[styles.iconButtonPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
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
              {isRecording && (
                <Animated.View
                  style={[
                    styles.recordingPulse, 
                    { 
                      opacity: fadeAnim, 
                      backgroundColor: theme.colors.error,
                      transform: [{ scale: scaleAnim }]
                    }
                  ]}
                />
              )}
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
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically center buttons with input field
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
    textAlignVertical: 'center',
  },
  textContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10, // Balanced with paddingTop
  },
  outline: {
    borderRadius: 24,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8, // Consistent spacing from input field
  },
  micContainer: { 
    position: 'relative', 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 20,
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
  },
  recordingPulse: {
    width: 34,
    height: 34,
    borderRadius: 17,
    position: 'absolute',
    opacity: 0.3,
  },
});
