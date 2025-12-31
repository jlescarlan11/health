import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <StoreProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <PaperProvider>
            <AppNavigator />
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </StoreProvider>
  );
}