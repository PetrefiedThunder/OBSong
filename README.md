# TopoSonics

TopoSonics is a full-stack monorepo for turning images into musical soundscapes. It analyzes visual features, maps them into musical note events, and renders playback through web and mobile clients with a supporting API.

## What This Repo Contains

- **Web app (Next.js 14)**: Upload images, preview mappings, play compositions with Tone.js, and export MIDI files.
- **Mobile app (Expo)**: Capture or select images, generate simplified playback, and manage compositions on-device.
- **API service (Fastify)**: Authenticated composition storage with Supabase-backed JWT verification and Postgres persistence.
- **Core packages**:
  - `@toposonics/core-image` for image analysis (brightness/depth profiles).
  - `@toposonics/core-audio` for mapping analysis into note events and presets.
  - `@toposonics/ui` for shared UI components.
  - `@toposonics/types` for shared TypeScript contracts.

## Current Capabilities

- **Image analysis** via Canvas and shared core-image utilities.
- **Visual-to-audio mapping** with presets, scales, and mapping modes.
- **Browser playback** using Tone.js.
- **MIDI export** for DAW workflows.
- **Composition CRUD API** with Supabase-authenticated access.
- **Shared types and UI components** across web and mobile.

## Known Limitations (In Progress)

- Mobile playback uses simplified audio rendering compared to the web client.
- Real-time camera input and advanced mapping modes are planned but not fully shipped.
- Auth flows in the web app are currently stubbed while API auth relies on Supabase.

## Quick Start

```bash
pnpm install
pnpm dev:web
```

See the app-specific READMEs for deeper setup and environment configuration:

- `apps/web/README.md`
- `apps/mobile/README.md`
- `apps/api/README.md`

## Repository Layout

```
apps/
  api/     Fastify API service
  web/     Next.js web client
  mobile/  Expo mobile client
packages/
  core-image/  Visual feature extraction
  core-audio/  Audio mapping and presets
  ui/          Shared UI components
  types/       Shared TypeScript contracts
```

## Documentation

- `PROJECT_CONTEXT.md` for architecture and dependency flow.
- `docs/` for additional platform and audio engine notes.

## License

MIT
