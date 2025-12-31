import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';
import { TextInputProps } from 'react-native-paper/lib/typescript/components/TextInput/TextInput';

interface InputProps extends Omit<TextInputProps, 'theme'> {
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
  ...props
}) => {
  const theme = useTheme();
  const hasError = !!errorText;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        mode={mode}
        style={[styles.input, style]}
        error={hasError}
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
