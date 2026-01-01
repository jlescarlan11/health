import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Constants from 'expo-constants';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/common';

// Let's create a wrapper component here to handle global app initialization logic that requires Redux
import NetInfo from '@react-native-community/netinfo';
import { setOfflineStatus, setLastSync } from './src/store/offlineSlice';
import { syncFacilities, getLastSyncTime } from './src/services/syncService';

const AppContent = () => {
  useEffect(() => {
    // Initial Sync Status Load
    const loadSyncStatus = async () => {
      const lastSync = await getLastSyncTime();
      if (lastSync) {
        store.dispatch(setLastSync(lastSync));
      }
    };
    loadSyncStatus();

    // Network Listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOffline = state.isConnected === false;
      store.dispatch(setOfflineStatus(isOffline));
    });

    // Initial Sync
    syncFacilities().catch(err => console.log('Initial sync failed (likely offline or error):', err));

    return () => unsubscribe();
  }, []);

  return (
    <>
      <OfflineBanner />
      <AppNavigator />
    </>
  );
};

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
      if (args[0]?.message?.includes('RNFBAppModule') || args[0]?.message?.includes('Native module')) {
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
          <PaperProvider>
            <AppContent />
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </StoreProvider>
  );
}