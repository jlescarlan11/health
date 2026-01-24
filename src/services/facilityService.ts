import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ensureApiBase = (url?: string) => {
  if (!url) return url;
  const normalized = url.replace(/\/+$/, '');
  if (/\/api(\/|$)/.test(normalized)) return normalized;
  return `${normalized}/api`;
};

// Get API URL from config, with fallback logic for mobile devices
const getApiUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.apiUrl || Constants.expoConfig?.extra?.backendUrl;

  // If a valid URL is configured and it's not localhost, use it
  if (
    configUrl &&
    configUrl !== 'http://localhost:3000/api' &&
    !configUrl.includes('process.env')
  ) {
    return ensureApiBase(configUrl);
  }

  // For mobile devices, localhost won't work - need to use the machine's IP
  // Metro bundler shows the IP in the connection URL (e.g., exp://192.168.1.4:8081)
  // We'll use the same IP but port 3000 for the backend
  if (Platform.OS !== 'web' && __DEV__) {
    // Try multiple ways to extract IP from Expo constants
    // Check debuggerHost first (most reliable for Expo Go)
    const debuggerHost =
      Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ipMatch = debuggerHost.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[FacilityService] Auto-detected backend URL: ${detectedUrl}`);
        return ensureApiBase(detectedUrl);
      }
    }

    // Try manifest hostUri
    const hostUri = Constants.manifest?.hostUri;
    if (hostUri) {
      const ipMatch = hostUri.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[FacilityService] Auto-detected backend URL from manifest: ${detectedUrl}`);
        return ensureApiBase(detectedUrl);
      }
    }

    // If we can't detect IP, this will fail on physical devices
    console.error(
      '[FacilityService] Could not auto-detect server IP. Backend requests will fail on physical device.',
    );
    console.error(
      '[FacilityService] Please set BACKEND_API_URL in .env file (e.g., BACKEND_API_URL=http://192.168.1.4:3000/api)',
    );
    console.error(
      '[FacilityService] Your Metro bundler IP is shown in the Expo start output (e.g., exp://192.168.1.4:8081)',
    );
  }

  return ensureApiBase(configUrl || 'http://localhost:3000/api');
};

const API_URL = getApiUrl();

import {
  getFacilities as getFacilitiesFromDb,
  saveFacilitiesFull as saveFacilitiesToDb,
} from './database';
import NetInfo from '@react-native-community/netinfo';
import { normalizeFacilitiesApiResponse } from '../utils/validation';

export const fetchFacilitiesFromApi = async () => {
  try {
    const response = await axios.get(`${API_URL}/facilities`);
    const normalized = normalizeFacilitiesApiResponse(response.data);
    if (normalized.rejectedCount > 0) {
      console.warn(
        `[FacilityService] Dropped ${normalized.rejectedCount} malformed facility record(s) from API response.`,
      );
    }
    return normalized.data;
  } catch (error: unknown) {
    console.error('Error fetching facilities from API:', error);
    throw error;
  }
};

export const getFacilities = async () => {
  const netInfo = await NetInfo.fetch();

  if (netInfo.isConnected) {
    try {
      const data = await fetchFacilitiesFromApi();
      // Optionally cache the data here as well, or rely on the background sync service.
      // For robust fallback, it's good to cache on every successful fetch.
      // We need to match the data structure expected by saveFacilities.
      // Assuming response.data is the array or has a facilities property.
      // Based on existing logs: response.data?.facilities?.length or response.data?.length

      let facilitiesToSave: unknown[] = [];
      if (Array.isArray(data)) {
        facilitiesToSave = data;
      } else if (data.facilities && Array.isArray(data.facilities)) {
        facilitiesToSave = data.facilities;
      }

      const normalized = normalizeFacilitiesApiResponse(facilitiesToSave);

      if (normalized.facilities.length > 0) {
        saveFacilitiesToDb(normalized.facilities).catch((err) =>
          console.error('Failed to cache facilities:', err),
        );
      }

      return normalizeFacilitiesApiResponse(data).data;
    } catch (error) {
      console.warn('API fetch failed, falling back to local database:', error);
    }
  }

  // Fallback to database
  console.log('Fetching facilities from local database');
  const localData = await getFacilitiesFromDb();
  if (localData && localData.length > 0) {
    return normalizeFacilitiesApiResponse(localData).data;
  }

  throw new Error('No internet connection and no cached data available.');
};
