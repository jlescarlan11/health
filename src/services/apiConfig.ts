import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ensureApiBase = (url?: string) => {
  if (!url) return url;
  const normalized = url.replace(/\/+$/, '');
  if (/\/api(\/|$)/.test(normalized)) return normalized;
  return `${normalized}/api`;
};

const getApiUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.apiUrl || Constants.expoConfig?.extra?.backendUrl;

  if (configUrl && configUrl !== 'http://localhost:3000/api' && !configUrl.includes('process.env')) {
    return ensureApiBase(configUrl);
  }

  if (Platform.OS !== 'web' && __DEV__) {
    const debuggerHost =
      Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ipMatch = debuggerHost.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[ApiConfig] Auto-detected backend URL: ${detectedUrl}`);
        return ensureApiBase(detectedUrl);
      }
    }

    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ipMatch = hostUri.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const detectedUrl = `http://${ipMatch[1]}:3000/api`;
        console.log(`[ApiConfig] Auto-detected backend URL from manifest: ${detectedUrl}`);
        return ensureApiBase(detectedUrl);
      }
    }

    console.error('[ApiConfig] Could not auto-detect server IP. Backend requests will fail on physical device.');
    console.error('[ApiConfig] Please set BACKEND_API_URL in .env file (e.g., BACKEND_API_URL=http://192.168.1.4:3000/api)');
    console.error('[ApiConfig] Your Metro bundler IP is shown in the Expo start output (e.g., exp://192.168.1.4:8081)');
  }

  return ensureApiBase(configUrl || 'http://localhost:3000/api');
};

export const API_URL = getApiUrl();
