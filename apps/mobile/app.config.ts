import { ConfigContext, ExpoConfig } from 'expo/config';
import 'dotenv/config';

const androidVersionCode = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '1', 10) || 1;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TopoSonics',
  slug: 'toposonics',
  version: '0.1.0',
  // Custom URL scheme for deep links / auth redirects. iOS derives one from the bundle
  // identifier automatically, but Android only emits the matching intent filter when this
  // is set — without it the two platforms disagree on linking behavior.
  scheme: 'com.toposonics.app',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
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
    versionCode: androidVersionCode,
    allowBackup: false,
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
    // Defense in depth: the expo-audio plugin above is configured not to request these,
    // but any other plugin or prebuild could re-add them. The app never records audio and
    // never draws over other apps, and unused permissions draw Play Console review
    // questions (foreground-service ones require an explicit declaration).
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-audio',
      {
        // Playback is a foreground-only preview: no lock-screen controls, no background
        // audio. Leaving the defaults on would declare an AudioControlsService with
        // foregroundServiceType="mediaPlayback" (which throws SecurityException on
        // Android 14+ once the matching permission is absent) and add UIBackgroundModes
        // "audio" on iOS, which App Review rejects when nothing plays in the background.
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
        // The app never records; don't request microphone access on either platform.
        recordAudioAndroid: false,
        microphonePermission: false,
      },
    ],
    // SDK 52+ configures the native splash screen via this plugin (the top-level
    // `splash` key was removed from ExpoConfig).
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#0a0a0f',
      },
    ],
    'expo-secure-store',
    'expo-apple-authentication',
    // Re-applies the guarded release signing config that `expo prebuild` would otherwise
    // reset to RN's default of signing releases with the public debug keystore.
    './plugins/withReleaseSigning',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow TopoSonics to access your photos to create soundscapes',
        cameraPermission: 'Allow TopoSonics to use your camera to capture images',
      },
    ],
  ],
  extra: {
    // apiUrl is now handled by the shared config
  },
});
