import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import { RootStackParamList } from '../types/navigation';
import NotFoundScreen from '../screens/NotFoundScreen';
import { PhoneLoginScreen } from '../features/auth/PhoneLoginScreen';
import { OTPVerificationScreen } from '../features/auth/OTPVerificationScreen';

// #region agent log
const _phoneType = typeof PhoneLoginScreen;
const _phoneUndef = PhoneLoginScreen === undefined;
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppNavigator.tsx:9', message: 'PhoneLoginScreen import POST-FIX', data: { type: _phoneType, isUndefined: _phoneUndef, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' } }) }).catch(() => {});
// #endregion
// #region agent log
const _otpType = typeof OTPVerificationScreen;
const _otpUndef = OTPVerificationScreen === undefined;
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppNavigator.tsx:12', message: 'OTPVerificationScreen import POST-FIX', data: { type: _otpType, isUndefined: _otpUndef, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' } }) }).catch(() => {});
// #endregion

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AppNavigator.tsx:19', message: 'AppNavigator render POST-FIX', data: { phoneDefined: !!PhoneLoginScreen, otpDefined: !!OTPVerificationScreen, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' } }) }).catch(() => {});
  // #endregion
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default AppNavigator;
