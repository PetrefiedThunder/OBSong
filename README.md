# TopoSonics

TopoSonics is a monorepo for turning images into musical soundscapes. It analyzes visual structure, maps that analysis into note events, and renders the result through a web studio, a mobile companion, and a Supabase-backed API.

## What Ships In v1

- **Web app (Next.js 14)**: Upload an image, choose a musical key/scale/preset, generate compositions with all supported mapping modes, play them in the browser with Tone.js, export MIDI, and save private compositions to your library.
- **Mobile app (Expo)**: Browse and manage compositions on iOS and Android. On-device image generation is currently supported on Android only.
- **API service (Fastify)**: Validates Supabase access tokens and stores private user compositions in Postgres.
- **Shared packages**:
  - `@toposonics/core-image` for image analysis
  - `@toposonics/core-audio` for musical mapping and note generation
  - `@toposonics/shared` for API/config/demo helpers
  - `@toposonics/types` for shared TypeScript contracts
  - `@toposonics/ui` for shared design tokens and UI primitives

## Current Product Contract

- **Web studio supports three mapping modes**:
  - `LINEAR_LANDSCAPE`
  - `DEPTH_RIDGE`
  - `MULTI_VOICE`
- **Composition library is private/authenticated**. `/compositions` and `/compositions/[id]` require sign-in.
- **Landing-page demos remain public/static**.
- **Mobile editor is Android-first** for on-device generation. iOS can browse synced content but generation is intentionally disabled until native parity exists.

## Quick Start

```bash
corepack enable
corepack prepare pnpm@8.15.0 --activate
pnpm install
pnpm dev:web
```

For full local setup, copy the example env files:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Then see:

- [apps/web/README.md](/Users/sellers/Documents/GitHub/OBSong/apps/web/README.md)
- [apps/mobile/README.md](/Users/sellers/Documents/GitHub/OBSong/apps/mobile/README.md)
- [apps/api/README.md](/Users/sellers/Documents/GitHub/OBSong/apps/api/README.md)
- [TESTING.md](/Users/sellers/Documents/GitHub/OBSong/TESTING.md)
- [QUICKSTART_MAC.md](/Users/sellers/Documents/GitHub/OBSong/QUICKSTART_MAC.md)

## Repository Layout

```text
apps/
  api/        Fastify API service
  web/        Next.js web client
  mobile/     Expo mobile client
packages/
  core-image/ Visual feature extraction
  core-audio/ Audio mapping and note generation
  shared/     Shared config, API, logging, and demo helpers
  ui/         Shared UI tokens and components
  types/      Shared TypeScript contracts
```

## Validation

The repo is wired to support:

- `pnpm typecheck`
- `pnpm test`

CI runs both commands with pnpm 8.15.0 on every push/PR.

## Known Limits

- Mobile playback uses a lightweight preview flow rather than feature-parity web synthesis.
- iOS generation is intentionally unavailable in this release.
- Real-time/live camera input is still future work.

## License

MIT
