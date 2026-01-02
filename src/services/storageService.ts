import { loadFirebaseStorage } from './storageLoader';
import { Platform } from 'react-native';

const { storage, error } = loadFirebaseStorage();

export const uploadFileToFirebase = async (uri: string, path: string): Promise<string> => {
  if (storage && !error) {
    try {
      const reference = storage().ref(path);
      
      // Handle different file URI formats
      const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
      
      const task = reference.putFile(uploadUri);
      
      // Wait for completion
      await task;
      
      // Get download URL
      const url = await reference.getDownloadURL();
      return url;
    } catch (e) {
      console.error('Firebase Storage Upload Error:', e);
      throw e;
    }
  } else {
    // Fallback/Simulation for Expo Go or when module is missing
    console.warn('Firebase Storage not available. Simulating upload.');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(uri); // Return local URI as "uploaded" URL for now
      }, 1500);
    });
  }
};
