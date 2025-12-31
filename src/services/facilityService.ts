import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get API URL from config, with fallback logic for mobile devices
const getApiUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.apiUrl || Constants.expoConfig?.extra?.backendUrl;
  
  // If a valid URL is configured and it's not localhost, use it
  if (configUrl && configUrl !== 'http://localhost:3000/api' && !configUrl.includes('process.env')) {
    return configUrl;
  }
  
  // For mobile devices, localhost won't work - need to use the machine's IP
  // Metro bundler shows the IP in the connection URL (e.g., exp://192.168.1.4:8081)
  // We'll use the same IP but port 3000 for the backend
  if (Platform.OS !== 'web' && __DEV__) {
    // Try multiple ways to extract IP from Expo constants
    // Check debuggerHost first (most reliable for Expo Go)
    const debuggerHost = Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ipMatch = debuggerHost.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[FacilityService] Auto-detected backend URL: ${detectedUrl}`);
        return detectedUrl;
      }
    }
    
    // Try manifest hostUri
    const hostUri = Constants.manifest?.hostUri;
    if (hostUri) {
      const ipMatch = hostUri.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[FacilityService] Auto-detected backend URL from manifest: ${detectedUrl}`);
        return detectedUrl;
      }
    }
    
    // If we can't detect IP, this will fail on physical devices
    console.error('[FacilityService] Could not auto-detect server IP. Backend requests will fail on physical device.');
    console.error('[FacilityService] Please set BACKEND_API_URL in .env file (e.g., BACKEND_API_URL=http://192.168.1.4:3000/api)');
    console.error('[FacilityService] Your Metro bundler IP is shown in the Expo start output (e.g., exp://192.168.1.4:8081)');
  }
  
  return configUrl || 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

// #region agent log
const logDebug = (location: string, message: string, data: any) => {
  // Also log to console for visibility in Metro bundler
  console.log(`[DEBUG] ${location}: ${message}`, data);
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' }) }).catch(() => {});
};
// #endregion

// #region agent log
const configUrl = Constants.expoConfig?.extra?.apiUrl || Constants.expoConfig?.extra?.backendUrl;
const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
logDebug('facilityService.ts:32', 'API URL resolved', { apiUrl: API_URL, platform: Platform.OS, configUrl, hostUri, expoConfigKeys: Object.keys(Constants.expoConfig?.extra || {}), manifestHostUri: Constants.manifest?.hostUri });
// #endregion

export const getFacilities = async () => {
  // #region agent log
  logDebug('facilityService.ts:50', 'getFacilities entry', { apiUrl: API_URL, expoConfigExtra: Constants.expoConfig?.extra, fullUrl: `${API_URL}/facilities` });
  // #endregion
  try {
    // #region agent log
    logDebug('facilityService.ts:54', 'Before axios.get', { requestUrl: `${API_URL}/facilities` });
    // #endregion
    const response = await axios.get(`${API_URL}/facilities`);
    // #region agent log
    logDebug('facilityService.ts:57', 'After axios.get success', { status: response.status, dataLength: response.data?.length || response.data?.facilities?.length || 0 });
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    logDebug('facilityService.ts:61', 'Error in getFacilities', { errorMessage: error?.message, errorCode: error?.code, errorResponse: error?.response?.status, requestUrl: `${API_URL}/facilities`, isAxiosError: error?.isAxiosError });
    // #endregion
    console.error('Error fetching facilities:', error);
    throw error;
  }
};
