import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
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