import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';

interface InputProps extends Omit<React.ComponentProps<typeof TextInput>, 'theme'> {
  errorText?: string;
  containerStyle?: ViewStyle;
  description?: string;
}

export const Input: React.FC<InputProps> = ({
  errorText,
  containerStyle,
  description,
  style,
  mode = 'outlined',
  label,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) => {
  const hasError = !!errorText;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        mode={mode}
        label={label}
        style={[styles.input, style]}
        error={hasError}
        accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
        accessibilityHint={accessibilityHint}
        {...props}
      />
      {description && !hasError && (
        <HelperText type="info" visible={true}>
          {description}
        </HelperText>
      )}
      <HelperText type="error" visible={hasError}>
        {errorText}
      </HelperText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  input: {
    backgroundColor: 'transparent',
  },
});
