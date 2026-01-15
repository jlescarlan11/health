import React, { useEffect } from 'react';
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
import { OfflineBanner } from './src/components/common';
import { setOfflineStatus, setLastSync } from './src/store/offlineSlice';
import { syncFacilities, getLastSyncTime } from './src/services/syncService';
import { initDatabase } from './src/services/database';
import { RootStackParamList } from './src/types/navigation';
import { theme } from './src/theme';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix],
  config: {
    screens: {
      Main: {
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
  useEffect(() => {
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

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <AppNavigator />
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
        return; // Suppress the error
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
            <NavigationContainer linking={linking}>
              <AppContent />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </StoreProvider>
  );
}
