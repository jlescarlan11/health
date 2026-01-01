import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { YakapEnrollmentScreen } from '../features/yakap/YakapEnrollmentScreen';
import { YakapStackParamList } from './types';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'YakapNavigator.tsx:3', message: 'After named import of YakapEnrollmentScreen', data: { isUndefined: YakapEnrollmentScreen === undefined, isNull: YakapEnrollmentScreen === null, type: typeof YakapEnrollmentScreen, hasComponent: !!YakapEnrollmentScreen, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' } }) }).catch(() => {});
// #endregion

const Stack = createStackNavigator<YakapStackParamList>();

const YakapNavigator = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'YakapNavigator.tsx:18', message: 'Before Stack.Screen render', data: { isUndefined: YakapEnrollmentScreen === undefined, isNull: YakapEnrollmentScreen === null, type: typeof YakapEnrollmentScreen, hasComponent: !!YakapEnrollmentScreen, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'E' } }) }).catch(() => {});
  // #endregion
  return (
    <Stack.Navigator>
      <Stack.Screen name="YakapEnrollment" component={YakapEnrollmentScreen} options={{ title: 'YAKAP Enrollment' }} />
    </Stack.Navigator>
  );
};

export default YakapNavigator;
