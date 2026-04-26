# @toposonics/mobile

Expo React Native app for TopoSonics.

## v1 Scope

- Browse private compositions from the API after sign-in
- View saved composition details
- Pick or capture an image in the editor
- Generate a composition on-device on **Android**
- Preview generated notes with simplified `expo-av` playback
- Save and reload compositions

## Platform Support

- **Android**: Full supported v1 path for pick/capture -> generate -> preview -> save
- **iOS**: Browse/sign-in/detail flows are supported; on-device generation is intentionally disabled and clearly messaged in the editor

The current release does not include an iOS native image-processing fallback.

## Native Project Folders

The repo now includes separate committed native projects:

- `apps/mobile/android`: Gradle project for Android Studio, emulator/device runs, and release bundles
- `apps/mobile/ios`: Xcode workspace/project for Simulator/device runs and release archives

Open them directly when you need native debugging:

```bash
open apps/mobile/android
open apps/mobile/ios/TopoSonics.xcworkspace
```

You do not need to run `expo prebuild` after a normal clone just to get workable native folders.

## Quick Start

```bash
cd apps/mobile
corepack pnpm install
corepack pnpm dev
```

Or from the repo root:

```bash
corepack pnpm dev:mobile
```

## Environment

Create `apps/mobile/.env` from the example file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Typical values:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
ANDROID_VERSION_CODE=1
IOS_BUILD_NUMBER=1.0.0
```

If you test on physical devices, point `EXPO_PUBLIC_API_URL` at your machine's LAN IP.

## Native Run Commands

From `apps/mobile/`:

```bash
corepack pnpm android
corepack pnpm ios
```

Native build commands:

```bash
# Android debug APK
cd apps/mobile/android
./gradlew assembleDebug

# Android release App Bundle
./gradlew bundleRelease
```

```bash
# iOS workspace
cd apps/mobile/ios
pod install
open TopoSonics.xcworkspace
```

Use Xcode Archive for a release `.ipa`, or EAS for managed store builds.

## Regenerating Native Projects

The checked-in native folders are the default working source of truth. Only regenerate them when you intentionally change Expo plugins, native module wiring, or app-config-driven native settings.

```bash
cd apps/mobile
corepack pnpm exec expo prebuild --clean
```

Review the resulting native diffs before committing them.

## Build And Submit

Repo-specific release and store submission steps live here:

- [Mobile release and submission guide](../../docs/MOBILE_SUBMISSION.md)

## Important Screens

- `HomeScreen`: entry point and navigation
- `EditorScreen`: image selection, generation, preview, and save flow
- `CompositionsScreen`: authenticated library list
- `CompositionDetailScreen`: replay/view metadata

## Shared Package Usage

The app imports workspace packages from their public roots, including:

```ts
import { mapLinearLandscape } from '@toposonics/core-audio';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import { API_URL, logError } from '@toposonics/shared';
```

## Validation

```bash
corepack pnpm --filter @toposonics/mobile typecheck
```

## Known Limits

- On-device generation is Android-only for now.
- Playback is a lightweight preview, not web-equivalent synthesis.
- Advanced mapping modes are intentionally out of scope on mobile in this release.

## License

MIT
