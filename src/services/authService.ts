// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:1',message:'About to import Firebase auth module',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

let auth: any;
let FirebaseAuthTypes: any;
let firebaseImportError: Error | null = null;

try {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:8',message:'Attempting Firebase auth import',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const firebaseAuth = require('@react-native-firebase/auth');
  auth = firebaseAuth.default;
  FirebaseAuthTypes = firebaseAuth.FirebaseAuthTypes;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:13',message:'Firebase auth import successful',data:{authType:typeof auth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  firebaseImportError = error;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:17',message:'Firebase auth import failed',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
}

export const authService = {
  signInWithPhone: async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:25',message:'signInWithPhone called',data:{hasAuth:!!auth,hasImportError:!!firebaseImportError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (firebaseImportError || !auth) {
      throw new Error(`Firebase not available: ${firebaseImportError?.message || 'Module not loaded'}`);
    }
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:30',message:'Calling auth() function',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:33',message:'auth().signInWithPhoneNumber succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return confirmation;
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authService.ts:36',message:'signInWithPhone error',data:{errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Error sending OTP:', error);
      throw error;
    }
  },

  confirmCode: async (verificationId: string, code: string): Promise<FirebaseAuthTypes.UserCredential> => {
    try {
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
      await auth().signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: FirebaseAuthTypes.User | null) => void) => {
    return auth().onAuthStateChanged(callback);
  }
};
