# TopoSonics Android Development Setup

This guide provides step-by-step instructions for setting up the TopoSonics Android application for development and building in Android Studio.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [OpenCV Configuration](#opencv-configuration)
4. [Project Generation](#project-generation)
5. [Android Studio Setup](#android-studio-setup)
6. [Building and Running](#building-and-running)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js**: >= 18.0.0 (LTS recommended)
- **pnpm**: 8.15.0 or higher
- **Android Studio**: Latest stable version (Hedgehog 2023.1.1 or newer)
- **Android SDK**: API Level 24-34
- **CMake**: Version 3.13 or higher (install via Android SDK Manager)
- **NDK**: Latest LTS version (install via Android SDK Manager)

### Android SDK Components

Install these components via Android Studio SDK Manager:

- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android NDK (Side by side)
- CMake
- Android SDK Command-line Tools

### System Requirements

- **Operating System**: macOS, Linux, or Windows
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free space

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo, including the mobile app and all packages.

### 3. Configure Environment Variables

Create a `.env` file in `apps/mobile/`:

```bash
cd apps/mobile
cp .env.example .env
```

Edit `.env` with your configuration:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## OpenCV Configuration

The native image processing module requires the OpenCV Android SDK. We've provided an automated setup script.

### Run the OpenCV Setup Script

From the project root:

```bash
./scripts/setup-android-opencv.sh
```

This script will:

1. Check if OpenCV is already installed
2. Download OpenCV 4.10.0 Android SDK (~200MB)
3. Extract it to `packages/native-image-processing/android/libs/opencv`
4. Verify the installation

### Manual OpenCV Setup (Alternative)

If the automated script fails, you can manually download and configure OpenCV:

1. Download [OpenCV 4.10.0 Android SDK](https://github.com/opencv/opencv/releases/download/4.10.0/opencv-4.10.0-android-sdk.zip)
2. Extract the zip file
3. Copy the extracted folder to `packages/native-image-processing/android/libs/opencv`
4. Verify the directory structure:
   ```
   packages/native-image-processing/android/libs/opencv/
   ├── sdk/
   │   ├── native/
   │   │   ├── jni/
   │   │   │   └── include/
   │   │   └── libs/
   │   │       ├── arm64-v8a/
   │   │       ├── armeabi-v7a/
   │   │       ├── x86/
   │   │       └── x86_64/
   ```

---

## Project Generation

Expo uses a "Continuous Native Generation" (CNG) workflow. The `android/` folder is **not committed** to the repository and must be generated locally.

### Generate the Android Project

From `apps/mobile/`:

```bash
cd apps/mobile
npx expo prebuild --platform android
```

This command will:

1. Generate the `android/` directory with Gradle configuration
2. Link all Expo modules and plugins
3. Configure native modules (including native-image-processing)
4. Set up Android permissions from `app.config.ts`

**Important Notes:**

- Run this command whenever you:
  - Clone the repository for the first time
  - Update `app.config.ts`
  - Add/remove Expo plugins
  - Modify native module configurations
- The `android/` directory is gitignored and regenerated on each machine

---

## Android Studio Setup

### 1. Open the Project

1. Launch **Android Studio**
2. Select **"Open an existing project"**
3. Navigate to `OBSong/apps/mobile/android`
4. Click **"OK"**

### 2. Gradle Sync

Android Studio will automatically start syncing Gradle. This process:

- Downloads all Gradle dependencies
- Configures the native-image-processing module
- Links OpenCV libraries
- Sets up CMake build configuration

**First sync may take 5-10 minutes** depending on your internet connection.

### 3. Configure Build Variants

1. In Android Studio, go to **Build > Select Build Variant**
2. Select **"debug"** for development builds
3. For release builds, select **"release"**

### 4. Verify CMake Configuration

Check that CMake recognizes OpenCV:

1. Open **Build > Refresh Linked C++ Projects**
2. Check the **Build** output panel for any CMake errors
3. You should see: `-- Found OpenCV: ...`

If CMake can't find OpenCV, verify the OpenCV installation path in:
- `packages/native-image-processing/android/src/main/cpp/CMakeLists.txt`
- `packages/native-image-processing/android/build.gradle`

---

## Building and Running

### Run on Emulator

1. Create an Android Virtual Device (AVD):
   - **Tools > Device Manager**
   - Click **"Create Device"**
   - Select a device (e.g., Pixel 5)
   - Choose system image: **API 33** or **API 34** (x86_64 for emulator)
   - Click **"Finish"**

2. Start the emulator:
   - Select your AVD in Device Manager
   - Click the **Play** button

3. Run the app:
   - Click the **Run** button (green triangle) in Android Studio
   - Or use: `Run > Run 'app'`

### Run on Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times

2. Enable **USB Debugging**:
   - Go to **Settings > Developer Options**
   - Enable **USB debugging**

3. Connect your device via USB

4. Select your device in Android Studio's device dropdown

5. Click **Run**

### Build APK

To generate a debug APK:

```bash
cd apps/mobile/android
./gradlew assembleDebug
```

The APK will be generated at:
```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Release (Production)

For production builds, use **EAS Build**:

```bash
cd apps/mobile
eas build --platform android --profile production
```

Ensure you have:
- An Expo account
- `eas-cli` installed globally: `npm install -g eas-cli`
- Configured signing keys in `eas.json`

---

## Troubleshooting

### OpenCV Not Found

**Error:** `Could not find OpenCV`

**Solution:**
1. Verify OpenCV installation: `ls packages/native-image-processing/android/libs/opencv`
2. Re-run the setup script: `./scripts/setup-android-opencv.sh`
3. Clean and rebuild:
   ```bash
   cd apps/mobile/android
   ./gradlew clean
   ./gradlew build
   ```

### Gradle Sync Failed

**Error:** `Could not resolve all dependencies`

**Solution:**
1. Check your internet connection
2. Invalidate caches: **File > Invalidate Caches / Restart**
3. Delete `.gradle` folder and re-sync:
   ```bash
   rm -rf ~/.gradle/caches
   ```

### Native Module Not Found

**Error:** `NativeImageProcessing module is not available`

**Solution:**
1. Ensure you ran `npx expo prebuild --platform android`
2. Check that `settings.gradle` includes `:native-image-processing`
3. Verify the module in `apps/mobile/android/settings.gradle`:
   ```gradle
   include ':native-image-processing'
   project(':native-image-processing').projectDir = new File(rootProject.projectDir, '../../packages/native-image-processing/android')
   ```

### CMake Build Errors

**Error:** CMake fails during build

**Solution:**
1. Install CMake via Android SDK Manager
2. Verify CMake version: `cmake --version` (should be >= 3.13)
3. Check NDK is installed: **Tools > SDK Manager > SDK Tools > NDK**
4. Clean CMake cache:
   ```bash
   cd apps/mobile/android
   rm -rf .cxx
   ./gradlew clean
   ```

### App Crashes on Launch

**Error:** App crashes immediately on device/emulator

**Solution:**
1. Check Logcat for error messages: **View > Tool Windows > Logcat**
2. Look for `UnsatisfiedLinkError` - indicates missing native libraries
3. Verify OpenCV libraries are present for your target architecture
4. Check permissions in `AndroidManifest.xml`

### Metro Bundler Issues

**Error:** JavaScript bundle not loading

**Solution:**
1. Start Metro bundler manually:
   ```bash
   cd apps/mobile
   npx expo start
   ```
2. In Android Studio, run without building JS bundle
3. Ensure `.env` variables are properly configured

### Secure Store Errors

**Error:** `SecureStore.setItemAsync` fails

**Solution:**
1. Secure Store requires a real device or emulator with Google Play Services
2. Ensure you added `expo-secure-store` to plugins in `app.config.ts`
3. Re-run `npx expo prebuild --platform android`

---

## Development Workflow

### Typical Development Cycle

1. **Make code changes** in TypeScript/Kotlin/C++
2. For JS/TS changes:
   - Metro will auto-reload (if running `expo start`)
3. For native changes (Kotlin/C++):
   - Rebuild in Android Studio
   - Or run: `./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`

### Hot Reload vs Full Rebuild

- **Hot Reload** (Fast Refresh): JS/TS changes only
- **Full Rebuild**: Required for:
  - Native module changes (Kotlin/C++)
  - `app.config.ts` modifications
  - Dependency updates
  - Gradle configuration changes

### Debugging Native Code

1. Set breakpoints in Kotlin files
2. Click **Debug** (bug icon) instead of **Run**
3. For C++ debugging:
   - Use `__android_log_print` for logging
   - View logs in Logcat with filter: `native-image-processing`

### Regenerating Native Project

If you need to regenerate the Android project:

```bash
cd apps/mobile
rm -rf android
npx expo prebuild --platform android
```

**Warning:** This will delete all manual changes in the `android/` folder.

---

## Additional Resources

- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [OpenCV Android Documentation](https://docs.opencv.org/4.10.0/d5/df8/tutorial_dev_with_OCV_on_Android.html)
- [Android CMake Guide](https://developer.android.com/studio/projects/configure-cmake)
- [TopoSonics Contributing Guide](../CONTRIBUTING.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check existing [GitHub Issues](https://github.com/PetrefiedThunder/OBSong/issues)
2. Search [Expo Forums](https://forums.expo.dev/)
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Android Studio version, etc.)

---

**Happy Developing! 🎵📱**
