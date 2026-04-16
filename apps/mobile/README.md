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

## Quick Start

```bash
cd apps/mobile
pnpm dev
```

Or from the repo root:

```bash
pnpm dev:mobile
```

## Environment

Create `apps/mobile/.env` from the example file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Typical values:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
IOS_BUILD_NUMBER=1.0.0
```

If you test on physical devices, point `EXPO_PUBLIC_API_URL` at your machine's LAN IP.

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
pnpm --filter @toposonics/mobile typecheck
```

## Known Limits

- On-device generation is Android-only for now.
- Playback is a lightweight preview, not web-equivalent synthesis.
- Advanced mapping modes are intentionally out of scope on mobile in this release.

## License

MIT
