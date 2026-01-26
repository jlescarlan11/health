require('dotenv').config();

module.exports = {
  expo: {
    name: 'health',
    slug: 'health',
    scheme: 'health',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.health.app',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
        LSApplicationQueriesSchemes: ['viber', 'fb-messenger'],
      },
    },
    android: {
      package: 'com.health.app',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-sqlite', '@react-native-firebase/app', 'expo-system-ui'],
    extra: {
      apiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000/api',
      backendUrl: process.env.BACKEND_API_URL || 'http://localhost:3000/api',
      geminiApiKey: process.env.GEMINI_API_KEY,
    },
  },
};
