import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';

import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner, SafetyRecheckModal } from './src/components/common';
import { setOfflineStatus, setLastSync, checkAssessmentTTL } from './src/store/offlineSlice';
import { setHighRisk } from './src/store/navigationSlice';
import { syncFacilities, getLastSyncTime } from './src/services/syncService';
import { initDatabase } from './src/services/database';
import { RootStackParamList } from './src/types/navigation';
import { theme, navigationTheme } from './src/theme';
import { useAppDispatch, useAppSelector } from './src/hooks';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix],
  config: {
    screens: {
      Home: 'home',
      Check: {
        path: 'check',
        screens: {
          NavigatorHome: '',
        },
      },
      Find: {
        path: 'find',
        screens: {
          FacilityDirectory: '',
        },
      },
      YAKAP: {
        path: 'yakap',
        screens: {
          YakapHome: '',
        },
      },
      SymptomAssessment: 'assessment',
      Recommendation: 'recommendation',
      CrisisSupport: 'crisis',
      FacilityDetails: 'details/:facilityId',
      YakapFaq: 'faq',
      EligibilityChecker: 'eligibility',
      EnrollmentPathway: 'pathway',
      EnrollmentGuide: 'guide/:pathwayId',
      EnrollmentCompletion: 'completion',
      NotFound: '*',
      PrivacyPolicy: 'privacy',
      TermsOfService: 'terms',
    },
  },
};

const AppContent = () => {
  const dispatch = useAppDispatch();
  const isHighRisk = useAppSelector((state) => state.navigation.isHighRisk);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

  useEffect(() => {
    // Check TTL on app start
    dispatch(checkAssessmentTTL());

    // Check for high risk status on mount
    if (isHighRisk) {
      setSafetyModalVisible(true);
    }

    // Initialize Database and Sync
    const startup = async () => {
      try {
        await initDatabase();

        // Initial Sync Status Load
        const lastSync = await getLastSyncTime();
        if (lastSync) {
          store.dispatch(setLastSync(lastSync));
        }

        // Initial Sync
        syncFacilities().catch((err) =>
          console.log('Initial sync failed (likely offline or error):', err),
        );
      } catch (err) {
        console.error('Startup initialization failed:', err);
      }
    };

    startup();

    // Network Listener
    const unsubscribe = NetInfo.addEventListener((state) => {
      store.dispatch(setOfflineStatus(!state.isConnected));
    });

    return () => unsubscribe();
  }, []);

  const handleDismissSafetyModal = () => {
    setSafetyModalVisible(false);
    // Optionally clear high risk status when dismissed
    dispatch(setHighRisk(false));
  };

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <AppNavigator />
      <SafetyRecheckModal visible={safetyModalVisible} onDismiss={handleDismissSafetyModal} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function App() {
  // Catch any unhandled errors during module loading
  React.useEffect(() => {
    const errorHandler = (error: Error) => {
      if (error?.message?.includes('RNFBAppModule') || error?.message?.includes('Native module')) {
        console.warn('Firebase native module not available (expected in Expo Go):', error.message);
      }
    };

    // Set up global error handler
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.message?.includes('RNFBAppModule') ||
        args[0]?.message?.includes('Native module')
      ) {
        errorHandler(args[0]);
        return; // Suppress the error;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <StoreProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <NavigationContainer linking={linking} theme={navigationTheme}>
              <AppContent />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </StoreProvider>
  );
}
