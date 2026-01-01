import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../types/navigation';
import { OTPInput } from '../../components/common/OTPInput';
import { Button } from '../../components/common/Button';
import { authService } from '../../services/authService';
import { setCredentials, setLoading, setError } from '../../store/authSlice';

type NavigationProp = StackNavigationProp<RootStackParamList, 'OTPVerification'>;
type RouteProps = RouteProp<RootStackParamList, 'OTPVerification'>;

export const OTPVerificationScreen = () => {
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [localVerificationId, setLocalVerificationId] = useState<string>('');

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const { verificationId, phoneNumber } = route.params;

  useEffect(() => {
    setLocalVerificationId(verificationId);
  }, [verificationId]);

  // Countdown timer for general display (optional, strict requirement was 60s countdown, 30s resend)
  // The prompt says: "resend OTP button with a 30-second cooldown ... and a 60-second countdown timer"
  // I'll assume the 60s is for code expiration visual or just a general timer.
  // I will use one timer for the resend button text or a separate display.
  // Let's implement both cleanly.
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      setResendCooldown((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (otpCode: string) => {
    setVerifying(true);
    dispatch(setLoading(true));

    try {
      const userCredential = await authService.confirmCode(localVerificationId, otpCode);
      
      const user = userCredential.user;
      dispatch(setCredentials({
        user: {
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        token: await user.getIdToken(),
      }));

      // Navigate to Home or Profile
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainHome' }],
      });
      
    } catch (err: any) {
      console.error(err);
      dispatch(setLoading(false));
      setVerifying(false);
      
      let errorMessage = 'Invalid code. Please try again.';
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code.';
      } else if (err.code === 'auth/session-expired') {
        errorMessage = 'The verification code has expired.';
      }
      
      dispatch(setError(errorMessage));
      Alert.alert('Verification Failed', errorMessage);
      setCode(''); // Clear code on error
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendCooldown(30);
      setTimer(60);
      const confirmation = await authService.signInWithPhone(phoneNumber);
      setLocalVerificationId(confirmation.verificationId);
      Alert.alert('OTP Sent', 'A new verification code has been sent to your number.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to resend OTP.');
      setResendCooldown(0); // Allow retry immediately if failed
    }
  };

  const onCodeChanged = (newCode: string) => {
    setCode(newCode);
    if (newCode.length === 6) {
      handleVerify(newCode);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>Verification</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter the 6-digit code sent to
          </Text>
          <Text variant="bodyLarge" style={styles.phoneNumber}>{phoneNumber}</Text>

          <View style={styles.otpContainer}>
            <OTPInput
              length={6}
              value={code}
              onChange={onCodeChanged}
              error={false}
            />
          </View>

          <View style={styles.timerContainer}>
            {timer > 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                Code expires in {timer}s
              </Text>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                Code expired
              </Text>
            )}
          </View>

          <View style={styles.resendContainer}>
            <Text variant="bodyMedium">Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text
                variant="bodyMedium"
                style={{
                  color: resendCooldown > 0 ? theme.colors.outline : theme.colors.primary,
                  fontWeight: 'bold',
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button
            title="Verify"
            onPress={() => handleVerify(code)}
            loading={verifying}
            disabled={code.length !== 6 || verifying}
            style={styles.button}
          />
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  phoneNumber: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 32,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
  },
  timerContainer: {
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  button: {
    width: '100%',
  },
});
