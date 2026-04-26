# Cross-Platform Testing Guide

Current cross-platform QA guidance for the TopoSonics v1 contract.

## Support Matrix

| Surface        | Current status                     | Primary checks                                                  |
| -------------- | ---------------------------------- | --------------------------------------------------------------- |
| Web            | Fully supported                    | Studio generation, playback, MIDI export, authenticated library |
| Android mobile | Fully supported for v1 mobile flow | Pick/capture -> generate -> preview -> save                     |
| iOS mobile     | Partially supported by design      | Sign-in, browsing, detail, Android-only generation messaging    |

## Prerequisites

1. Enable Corepack and pnpm:

```bash
corepack enable
corepack prepare pnpm@8.15.0 --activate
```

2. Install dependencies:

```bash
corepack pnpm install
```

3. Configure env files as needed:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

4. Start the repo services you need:

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:mobile
```

## Automated Validation

Run these before manual QA:

```bash
corepack pnpm typecheck
corepack pnpm test
```

## Web Checks

Test the web app in current Chrome and Safari at minimum.

### Studio

1. Open `http://localhost:3000/studio`.
2. Upload an image.
3. Switch between `LINEAR_LANDSCAPE`, `DEPTH_RIDGE`, and `MULTI_VOICE`.
4. Generate a composition in each mode.

Expected results:

- Upload succeeds without console errors
- Analysis updates when the mapping mode changes
- Each mapping mode produces a distinct valid composition

### Playback And Export

1. Play a generated composition.
2. Stop playback.
3. Export MIDI.

Expected results:

- Playback starts cleanly after the required browser gesture
- Stop halts playback immediately
- MIDI export completes successfully

### Authenticated Library

1. Sign out and visit `/compositions`.
2. Confirm the sign-in CTA appears.
3. Sign in.
4. Save a composition from the studio.
5. Open the saved item in `/compositions/[id]`.

Expected results:

- Anonymous users do not get library data
- Authenticated save succeeds
- Library list and detail pages load the saved composition

## Android Checks

Use the committed native Android project or Expo run workflow, not Expo Go.

### Launch Options

```bash
cd apps/mobile
corepack pnpm android
```

or open `apps/mobile/android` in Android Studio.

### Android v1 Flow

1. Launch the app on an emulator or device.
2. Open the editor.
3. Pick an image from the gallery or capture one with the camera.
4. Generate a composition.
5. Preview playback.
6. Save the composition.
7. Open it from the authenticated compositions list.

Expected results:

- Android completes pick/capture -> generate -> preview -> save without crashing
- Saved compositions appear in the authenticated library
- Detail view loads successfully

## iOS Checks

Use the committed Xcode workspace or Expo run workflow.

### Launch Options

```bash
cd apps/mobile
corepack pnpm ios
```

or open `apps/mobile/ios/TopoSonics.xcworkspace` in Xcode.

### iOS v1 Flow

1. Launch the app on Simulator or device.
2. Sign in.
3. Browse the compositions list.
4. Open a composition detail page.
5. Visit the editor and inspect the generation area.

Expected results:

- Sign-in, compositions list, and detail flows work
- The editor clearly explains that on-device generation is Android-only
- The generation action is disabled or safely blocked
- iOS does not attempt to call the unavailable native generation path

## Regression Checklist

- Landing-page demos still load on the web
- No workspace package is imported through `dist/*`
- Mobile auth flow still works on both platforms
- API-backed save/load flows still work after dependency updates

## Primary References

- [TESTING.md](TESTING.md)
- [apps/mobile/README.md](apps/mobile/README.md)
- [docs/ANDROID_SETUP.md](docs/ANDROID_SETUP.md)
- [docs/MOBILE_SUBMISSION.md](docs/MOBILE_SUBMISSION.md)
