// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:1',message:'Module loading - using lazy Firebase loader',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'}})}).catch(()=>{});
// #endregion
import { loadFirebaseAuth } from './firebaseAuthLoader';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Helper function to throw a helpful error when Firebase is not available
const throwFirebaseUnavailableError = (operation: string) => {
  const errorMessage = isExpoGo
    ? `Firebase Auth is not available in Expo Go. Please use a development build (run 'npx expo prebuild' then 'npx expo run:android' or 'npx expo run:ios') to use authentication features.`
    : `Firebase Auth is not available. The native module may not be properly linked. Operation: ${operation}`;
  throw new Error(errorMessage);
};

// Get Firebase Auth lazily (only when needed, not at module load time)
const getFirebaseAuth = () => {
  const { auth, error } = loadFirebaseAuth();
  if (error || !auth) {
    throwFirebaseUnavailableError('getFirebaseAuth');
  }
  return auth;
};

export const authService = {
  signInWithPhone: async (phoneNumber: string): Promise<any> => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:18',message:'signInWithPhone called',data:{phoneNumber,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'}})}).catch(()=>{});
    // #endregion
    try {
      const auth = getFirebaseAuth();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:22',message:'Calling auth() before signInWithPhoneNumber',data:{timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'}})}).catch(()=>{});
      // #endregion
      const authInstance = auth();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:25',message:'auth() call succeeded',data:{hasAuthInstance:!!authInstance,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'}})}).catch(()=>{});
      // #endregion
      const confirmation = await authInstance.signInWithPhoneNumber(phoneNumber);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:28',message:'signInWithPhoneNumber succeeded',data:{verificationId:confirmation.verificationId,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'}})}).catch(()=>{});
      // #endregion
      return confirmation;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:32',message:'signInWithPhone error',data:{error:String(error),errorCode:(error as any)?.code,errorMessage:(error as any)?.message,timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'}})}).catch(()=>{});
      // #endregion
      console.error('Error sending OTP:', error);
      throw error;
    }
  },

  confirmCode: async (verificationId: string, code: string): Promise<any> => {
    try {
      const auth = getFirebaseAuth();
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await auth().signInWithCredential(credential);
      return userCredential;
    } catch (error) {
      console.error('Error confirming code:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      const auth = getFirebaseAuth();
      await auth().signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: any | null) => void) => {
    try {
      const auth = getFirebaseAuth();
      return auth().onAuthStateChanged(callback);
    } catch (error) {
      console.warn('Firebase Auth not available - onAuthStateChanged will not work');
      // Return a no-op unsubscribe function
      return () => {};
    }
  },

  // Helper to check if Firebase is available
  isAvailable: (): boolean => {
    const { error } = loadFirebaseAuth();
    return !error;
  }
};
