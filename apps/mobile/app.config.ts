import { ConfigContext, ExpoConfig } from 'expo/config';
import 'dotenv/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TopoSonics',
  slug: 'toposonics',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a0f',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.toposonics.app',
    buildNumber: process.env.IOS_BUILD_NUMBER ?? '1.0.0',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a0f',
    },
    package: 'com.toposonics.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-av'],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.toposonics.com',
  },
});
