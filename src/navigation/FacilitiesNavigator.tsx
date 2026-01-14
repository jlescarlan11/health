import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FacilityDirectoryScreen } from '../features/facilities/FacilityDirectoryScreen';
import FacilityDetailsScreen from '../screens/FacilityDetailsScreen';
import { FacilitiesStackParamList } from './types';
import StandardHeader from '../components/common/StandardHeader';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'FacilitiesNavigator.tsx:6',
    message: 'FacilityDirectoryScreen import check',
    data: {
      isUndefined: FacilityDirectoryScreen === undefined,
      type: typeof FacilityDirectoryScreen,
      hasComponent: !!FacilityDirectoryScreen,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    },
  }),
}).catch(() => {});
// #endregion

// #region agent log
const _defaultImport = FacilityDirectoryScreen;
const _namedImport = require('../features/facilities/FacilityDirectoryScreen');
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'FacilitiesNavigator.tsx:10',
    message: 'Import comparison',
    data: {
      defaultUndef: _defaultImport === undefined,
      namedHasExport: !!_namedImport.FacilityDirectoryScreen,
      namedKeys: Object.keys(_namedImport),
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    },
  }),
}).catch(() => {});
// #endregion

const Stack = createStackNavigator<FacilitiesStackParamList>();

const FacilitiesNavigator = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'FacilitiesNavigator.tsx:18',
      message: 'FacilitiesNavigator render',
      data: {
        screenComponentUndef: FacilityDirectoryScreen === undefined,
        detailsComponentDefined: !!FacilityDetailsScreen,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      },
    }),
  }).catch(() => {});
  // #endregion
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FacilityDirectory"
        component={FacilityDirectoryScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default FacilitiesNavigator;
