# Mobile Release And Submission

This guide covers the committed native mobile folders, production builds, and store submission flow for TopoSonics.

## Native Folder Layout

- `apps/mobile/android`: Android Studio and Gradle project
- `apps/mobile/ios`: Xcode workspace/project

These folders are committed and are expected to be directly usable after cloning the repo.

## App Identifiers

- Android package: `com.toposonics.app`
- iOS bundle identifier: `com.toposonics.app`

Both are defined in `apps/mobile/app.config.ts`.

## Before You Build

1. Install workspace dependencies:

```bash
corepack pnpm install
```

2. Use JDK 17 for Android release builds. For example, on macOS:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
java -version
```

3. Create the mobile env file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

4. Fill in the environment values required for the build:

```env
EXPO_PUBLIC_API_URL=https://your-api-host
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANDROID_VERSION_CODE=1
IOS_BUILD_NUMBER=1.0.0
```

5. Make sure the Apple and Google store accounts are set up for `com.toposonics.app`.

6. Run the release prerequisite checks:

```bash
corepack pnpm release:check:env
corepack pnpm release:check:mobile
```

## Local Native Release Builds

### Android

```bash
corepack pnpm build:mobile:android:release
```

Output:

- `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

### iOS

```bash
corepack pnpm build:mobile:ios:release
```

This archives the `TopoSonics` scheme with a Release configuration. It requires a configured Apple development team/signing profile for `com.toposonics.app`.
If the team is not committed in the Xcode project, pass it at build time:

```bash
IOS_DEVELOPMENT_TEAM=YOURTEAMID corepack pnpm build:mobile:ios:release
```

## EAS Production Builds

The repo already includes `development`, `preview`, and `production` profiles in `apps/mobile/eas.json`.

### Android Production Build

```bash
cd apps/mobile
corepack pnpm dlx eas-cli build --platform android --profile production
```

This produces a store-ready Android App Bundle because the production profile uses:

- `distribution: "store"`
- `android.buildType: "app-bundle"`

### iOS Production Build

```bash
cd apps/mobile
corepack pnpm dlx eas-cli build --platform ios --profile production
```

This uses the committed production profile with a Release build configuration.

## Android Submission

The repo is prewired for Android submit through EAS, but the Play service-account key is not committed.

1. Create this folder locally:

```bash
mkdir -p apps/mobile/credentials
```

2. Place the Google Play service account JSON here:

- `apps/mobile/credentials/google-service-account.json`

3. Run the submit command:

```bash
cd apps/mobile
corepack pnpm dlx eas-cli submit --platform android --profile production
```

The submit profile already points at:

- `./credentials/google-service-account.json`

Manual fallback:

- Upload the generated `.aab` to the Google Play Console yourself.

## iOS Submission

The repo has an iOS production build profile, but iOS submit credentials are not hardcoded in `eas.json`.

Use one of these paths:

1. EAS submit after Apple credentials are configured in Expo/EAS:

```bash
cd apps/mobile
corepack pnpm dlx eas-cli submit --platform ios --latest
```

2. Manual upload:

- Export the `.ipa` from Xcode or download it from EAS
- Upload it with Transporter or App Store Connect tooling

## When To Regenerate Native Projects

Do not regenerate the native folders for normal day-to-day work. Use prebuild only when you intentionally change Expo plugins, native config, or module wiring.

```bash
cd apps/mobile
corepack pnpm exec expo prebuild --clean
```

If you do this, review and commit the resulting `android/` and `ios/` diffs together.
