import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PhoneLoginScreen.tsx:10',message:'PhoneLoginScreen importing authService',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}})}).catch(()=>{});
// #endregion
import { authService } from '../../services/authService';
import { useDispatch } from 'react-redux';
import { setLoading, setError } from '../../store/authSlice';

type NavigationProp = StackNavigationProp<RootStackParamList, 'PhoneLogin'>;

export const PhoneLoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);

  const validatePhone = (phone: string) => {
    // Remove non-digits just in case, though keyboard type helps
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      return 'Phone number must be 10 digits.';
    }
    if (!cleanPhone.startsWith('9')) {
      return 'Phone number must start with 9.';
    }
    return null;
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleSendOTP = async () => {
    const error = validatePhone(phoneNumber);
    if (error) {
      setInputError(error);
      return;
    }
    setInputError(undefined);

    const fullPhoneNumber = `+63${phoneNumber}`;
    
    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      const confirmation = await authService.signInWithPhone(fullPhoneNumber);
      dispatch(setLoading(false));
      setLocalLoading(false);
      
      navigation.navigate('OTPVerification', {
        verificationId: confirmation.verificationId,
        phoneNumber: fullPhoneNumber,
      });
    } catch (err: any) {
      console.error(err);
      dispatch(setLoading(false));
      setLocalLoading(false);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number is invalid.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      dispatch(setError(errorMessage));
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Welcome to HEALTH</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your mobile number to log in or sign up.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.phoneInputContainer}>
              <View style={[styles.prefixContainer, { borderColor: theme.colors.outline }]}>
                <Text variant="bodyLarge" style={styles.prefixText}>+63</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Mobile Number"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text.replace(/[^0-9]/g, ''));
                    if (inputError) setInputError(undefined);
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="9123456789"
                  errorText={inputError}
                  autoFocus
                  onFocus={handleInputFocus}
                />
              </View>
            </View>

            <View style={[styles.warningContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>
                ⚠️ Important: Standard SMS rates apply (approximately ₱0.50–₱1.00). By proceeding, you agree to receive an OTP for verification.
              </Text>
            </View>

            <Button
              title="Send OTP"
              onPress={handleSendOTP}
              loading={localLoading}
              disabled={localLoading || phoneNumber.length !== 10}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align top to handle error text layout
    marginBottom: 16,
  },
  prefixContainer: {
    height: 56, // Match default input height roughly
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 6, // Adjust alignment with input
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  prefixText: {
    fontWeight: 'bold',
  },
  inputWrapper: {
    flex: 1,
  },
  warningContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});

export default PhoneLoginScreen;