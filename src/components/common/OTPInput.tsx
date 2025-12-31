import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  containerStyle?: ViewStyle;
  error?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  containerStyle,
  error = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable style={styles.inputsContainer} onPress={handlePress}>
        {Array(length)
          .fill(0)
          .map((_, index) => {
            const char = value[index];
            const isCurrent = index === value.length;
            const isFilled = index < value.length;

            let borderColor = theme.colors.outline;
            if (error) {
              borderColor = theme.colors.error;
            } else if (isFocused && isCurrent) {
              borderColor = theme.colors.primary;
            }

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  {
                    borderColor: borderColor,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.text,
                    {
                      color: isFilled ? theme.colors.onSurface : theme.colors.onSurfaceDisabled,
                    },
                  ]}
                >
                  {char}
                </Text>
              </View>
            );
          })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          if (text.length <= length) {
            onChange(text);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        caretHidden
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  box: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
