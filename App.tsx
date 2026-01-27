import React, { useEffect, useState, useMemo } from 'react';
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
import { setOfflineStatus, setLastSync } from './src/store/offlineSlice';
import { syncFacilities, getLastSyncTime } from './src/services/syncService';
import { initDatabase } from './src/services/database';
import { RootStackParamList } from './src/types/navigation';
import {
  registerForPushNotificationsAsync,
  configureNotifications,
} from './src/services/notificationService';
import { theme, navigationTheme, getScaledTheme } from './src/theme';
import { useAppDispatch, useAppSelector, useAdaptiveUI } from './src/hooks';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix],
  config: {
    screens: {
      Home: 'home',
      Check: {
        path: 'check',
        screens: {
          CheckSymptom: '',
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
  const { scaleFactor, isPWDMode, layoutPadding } = useAdaptiveUI();
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

  const scaledTheme = useMemo(() => {
    const baseTheme = getScaledTheme(scaleFactor);
    if (!isPWDMode) {
      return baseTheme;
    }
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: '#FEF9F2',
        onBackground: '#1B1C1D',
        surface: '#FFFFFF',
        outline: '#7C3AED',
      },
      roundness: 18,
      rippleColor: '#E5E7EB',
    };
  }, [scaleFactor, isPWDMode]);

  useEffect(() => {
    // Configure notifications
    configureNotifications();
    registerForPushNotificationsAsync().catch((err) =>
      console.log('Notification permission init failed:', err),
    );

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

    return () => {
      unsubscribe();
    };
  }, [isHighRisk]);

  const handleDismissSafetyModal = () => {
    setSafetyModalVisible(false);
    // Do NOT clear high risk status here.
    // User must remain high risk until they take action or re-assess.
    // dispatch(setHighRisk(false));
  };

  const adaptiveContainerStyle = [
    styles.container,
    isPWDMode && {
      paddingHorizontal: layoutPadding / 2,
      paddingTop: layoutPadding / 2,
      paddingBottom: layoutPadding / 2,
      backgroundColor: '#FEF9F2',
    },
  ];

  return (
    <PaperProvider theme={scaledTheme}>
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <View style={adaptiveContainerStyle}>
          <OfflineBanner />
          <AppNavigator />
          <SafetyRecheckModal visible={safetyModalVisible} onDismiss={handleDismissSafetyModal} />
        </View>
      </NavigationContainer>
    </PaperProvider>
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
      if (
        error?.message?.includes('RNFBAppModule') ||
        error?.message?.includes('Native module') ||
        error?.message?.includes('Voice')
      ) {
        console.warn('Native module not available (expected in some development environments):', error.message);
      }
    };

    // Set up global error handler
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.message?.includes('RNFBAppModule') ||
        args[0]?.message?.includes('Native module') ||
        args[0]?.message?.includes('Voice')
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
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </StoreProvider>
  );
}
