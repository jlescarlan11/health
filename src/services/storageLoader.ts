// Lazy loader for Firebase Storage to avoid crashes in Expo Go
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let firebaseStorageModule: any = null;
let isLoaded = false;
let loadError: Error | null = null;

export const loadFirebaseStorage = (): { storage: any; error: Error | null } => {
  if (isLoaded) {
    return { storage: firebaseStorageModule?.default || firebaseStorageModule, error: loadError };
  }

  if (isExpoGo) {
    loadError = new Error(
      'Firebase Storage is not available in Expo Go. Use a development build instead.',
    );
    isLoaded = true;
    return { storage: null, error: loadError };
  }

  try {
    const moduleName = '@react-native-firebase/storage';
    // Access require through global to avoid static analysis
    const dynamicRequire =
      typeof require !== 'undefined'
        ? require
        : () => {
            throw new Error('require not available');
          };
    firebaseStorageModule = dynamicRequire(moduleName);

    // Test if the module can actually be used
    try {
      const testStorage = firebaseStorageModule.default || firebaseStorageModule;
      if (typeof testStorage === 'function') {
        const testInstance = testStorage(); // This will fail if native module isn't linked
        isLoaded = true;
        loadError = null;
        return {
          storage: testStorage,
          error: null,
        };
      }
    } catch (nativeError: any) {
      loadError = nativeError;
      isLoaded = true;
      return { storage: null, error: loadError };
    }

    isLoaded = true;
    loadError = null;
    return {
      storage: firebaseStorageModule.default || firebaseStorageModule,
      error: null,
    };
  } catch (error: any) {
    loadError = error;
    isLoaded = true;
    return { storage: null, error: loadError };
  }
};
