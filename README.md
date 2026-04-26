# TopoSonics

TopoSonics is a monorepo for turning images into musical soundscapes. It analyzes visual structure, maps that analysis into note events, and renders the result through a web studio, a mobile companion, and a Supabase-backed API.

## At A Glance

- Turn images into playable musical compositions
- Generate different results with `LINEAR_LANDSCAPE`, `DEPTH_RIDGE`, and `MULTI_VOICE`
- Play compositions in the browser with Tone.js
- Export MIDI for DAW workflows
- Save private compositions with Supabase-backed authentication
- Use the same core analysis and mapping packages across web and mobile

## What Ships In v1

- **Web app (Next.js 15)**: Upload an image, choose a musical key/scale/preset, generate compositions with all supported mapping modes, play them in the browser with Tone.js, export MIDI, and save private compositions to your library.
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
corepack pnpm install
corepack pnpm dev:api
corepack pnpm dev:web
```

For full local setup, copy the example env files:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Then fill in the Supabase values needed for authenticated save and library flows.

## Local Development

```bash
# API
corepack pnpm dev:api

# Web studio
corepack pnpm dev:web

# Mobile app
corepack pnpm dev:mobile
```

## Documentation

- [Web app](apps/web/README.md)
- [Mobile app](apps/mobile/README.md)
- [Mobile release and submission](docs/MOBILE_SUBMISSION.md)
- [API](apps/api/README.md)
- [Testing guide](TESTING.md)
- [macOS quick start](QUICKSTART_MAC.md)

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

## Typical Flow

1. Open the web studio and upload an image.
2. Choose a key, scale, preset, and mapping mode.
3. Generate note events from the image analysis.
4. Play the result in the browser or export it as MIDI.
5. Sign in to save the composition to your private library.

## Validation

The repo is wired to support:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm release:check:mobile`
- `pnpm release:check:env`

CI runs lint, typecheck, tests, and the production build with pnpm 8.15.0 on every push/PR. The release env check is intentionally separate because it requires real Supabase/API values rather than example placeholders.

## Known Limits

- Mobile playback uses a lightweight preview flow rather than feature-parity web synthesis.
- iOS generation is intentionally unavailable in this release.
- Real-time/live camera input is still future work.

## License

MIT
