// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:1',message:'App.tsx module loading',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}})}).catch(()=>{});
// #endregion
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Constants from 'expo-constants';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:9',message:'App runtime environment check',data:{executionEnvironment:Constants.executionEnvironment,isExpoGo:Constants.executionEnvironment==='storeClient',isStandalone:Constants.executionEnvironment==='standalone',isBare:Constants.executionEnvironment==='bare',timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}})}).catch(()=>{});
// #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:53',message:'App component rendering',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}})}).catch(()=>{});
  // #endregion
  
  // Catch any unhandled errors during module loading
  React.useEffect(() => {
    const errorHandler = (error: Error) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:59',message:'Global error caught',data:{error:String(error),errorMessage:error?.message,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}})}).catch(()=>{});
      // #endregion
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