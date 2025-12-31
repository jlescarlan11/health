import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { TextInput, HelperText, useTheme, Text } from 'react-native-paper';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  errorText?: string;
  label?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  errorText,
  label = 'Phone Number',
  containerStyle,
  disabled = false,
}) => {
  const theme = useTheme();
  const [countryCode, setCountryCode] = useState('+63'); // Default to Philippines

  const hasError = !!errorText;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        <TextInput
          mode="outlined"
          value={countryCode}
          onChangeText={setCountryCode}
          style={styles.countryCode}
          disabled={disabled}
          keyboardType="phone-pad"
          maxLength={4}
          error={hasError}
          accessibilityLabel="Country Code"
        />
        <TextInput
          mode="outlined"
          label={label}
          value={value}
          onChangeText={onChangeText}
          style={styles.phoneNumber}
          disabled={disabled}
          keyboardType="phone-pad"
          error={hasError}
          accessibilityLabel={label}
        />
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countryCode: {
    width: 80,
    marginRight: 8,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  phoneNumber: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
