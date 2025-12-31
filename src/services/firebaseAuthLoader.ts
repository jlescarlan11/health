// Lazy loader for Firebase Auth to avoid crashes in Expo Go
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:1',message:'firebaseAuthLoader module loading',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'}})}).catch(()=>{});
// #endregion
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:7',message:'Environment check in loader',data:{isExpoGo,executionEnvironment:Constants.executionEnvironment,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'}})}).catch(()=>{});
// #endregion

let firebaseAuthModule: any = null;
let isLoaded = false;
let loadError: Error | null = null;

export const loadFirebaseAuth = (): { auth: any; FirebaseAuthTypes: any; error: Error | null } => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:14',message:'loadFirebaseAuth called',data:{isLoaded,isExpoGo,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'}})}).catch(()=>{});
  // #endregion
  
  if (isLoaded) {
    return { auth: firebaseAuthModule?.default || firebaseAuthModule, FirebaseAuthTypes: firebaseAuthModule?.FirebaseAuthTypes, error: loadError };
  }

  if (isExpoGo) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:20',message:'Expo Go detected - skipping Firebase',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'}})}).catch(()=>{});
    // #endregion
    loadError = new Error('Firebase Auth is not available in Expo Go. Use a development build instead.');
    isLoaded = true;
    return { auth: null, FirebaseAuthTypes: null, error: loadError };
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:26',message:'Attempting to require Firebase',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'}})}).catch(()=>{});
  // #endregion

  try {
    // Use a dynamic require that Metro can't statically analyze
    // This prevents Metro from trying to resolve the module at bundle time in Expo Go
    const moduleName = '@react-native-firebase/auth';
    // Access require through global to avoid static analysis
    const dynamicRequire = typeof require !== 'undefined' ? require : (() => { throw new Error('require not available'); });
    firebaseAuthModule = dynamicRequire(moduleName);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:38',message:'Firebase require succeeded',data:{hasModule:!!firebaseAuthModule,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'}})}).catch(()=>{});
    // #endregion
    
    // Test if the module can actually be used (native module might not be linked)
    try {
      const testAuth = firebaseAuthModule.default || firebaseAuthModule;
      if (typeof testAuth === 'function') {
        // Try to call it - this will fail if native module isn't available
        const testInstance = testAuth();
        isLoaded = true;
        loadError = null;
        return { 
          auth: testAuth, 
          FirebaseAuthTypes: firebaseAuthModule.FirebaseAuthTypes,
          error: null 
        };
      }
    } catch (nativeError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:52',message:'Firebase module loaded but native module not available',data:{error:String(nativeError),errorMessage:nativeError?.message,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'}})}).catch(()=>{});
      // #endregion
      loadError = nativeError;
      isLoaded = true;
      return { auth: null, FirebaseAuthTypes: null, error: loadError };
    }
    
    isLoaded = true;
    loadError = null;
    return { 
      auth: firebaseAuthModule.default || firebaseAuthModule, 
      FirebaseAuthTypes: firebaseAuthModule.FirebaseAuthTypes,
      error: null 
    };
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebaseAuthLoader.ts:66',message:'Firebase require failed',data:{error:String(error),errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'}})}).catch(()=>{});
    // #endregion
    loadError = error;
    isLoaded = true;
    return { auth: null, FirebaseAuthTypes: null, error: loadError };
  }
};

