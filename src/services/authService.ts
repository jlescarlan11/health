import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const authService = {
  signInWithPhone: async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      return confirmation;
    } catch (error) {
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
