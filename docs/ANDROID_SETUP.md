# TopoSonics Android Setup

Current Android setup and build workflow for the committed native mobile project.

## Workflow Summary

- The Android project lives in `apps/mobile/android`
- It is committed to the repo and meant to be opened directly
- Normal development does not require regenerating the Android folder first

## Prerequisites

- Node.js 20+
- Corepack-enabled pnpm 8.15.0
- Java 17
- Android Studio with:
  - Android SDK
  - Android SDK Platform 34
  - Android Build-Tools
  - Android Emulator

## Initial Setup

From the repo root:

```bash
corepack enable
corepack prepare pnpm@8.15.0 --activate
corepack pnpm install
```

Create the mobile env file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set at least:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Optional OpenCV Setup

If the native image-processing module needs the OpenCV SDK on a fresh machine, run:

```bash
./scripts/setup-android-opencv.sh
```

This downloads OpenCV into `packages/native-image-processing/android/libs/opencv`.

## Open The Project

Use either path:

1. Android Studio -> Open -> `apps/mobile/android`
2. CLI from `apps/mobile/`:

```bash
corepack pnpm android
```

## Local Build Commands

From `apps/mobile/android`:

```bash
# Debug APK
./gradlew assembleDebug

# Release App Bundle
./gradlew bundleRelease
```

The release bundle is written to:

- `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

## When To Regenerate Native Android Files

Only regenerate the Android project when you intentionally change:

- Expo plugins
- app-config-driven native settings
- native module wiring

Use:

```bash
cd apps/mobile
corepack pnpm exec expo prebuild --clean --platform android
```

After regeneration, review the resulting diffs in `apps/mobile/android` before committing them.

## Troubleshooting

### Gradle build fails because Java is wrong

Use Java 17 and make sure `JAVA_HOME` points at it.

### Native image-processing build fails

Check that the OpenCV SDK exists at:

- `packages/native-image-processing/android/libs/opencv`

If it does not, run `./scripts/setup-android-opencv.sh`.

### API-backed mobile features do not work

Verify the mobile env file points at a reachable API host and valid Supabase credentials.

## Related Docs

- [apps/mobile/README.md](../apps/mobile/README.md)
- [docs/MOBILE_SUBMISSION.md](MOBILE_SUBMISSION.md)
- [TESTING.md](../TESTING.md)
