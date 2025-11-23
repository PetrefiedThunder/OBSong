# TopoSonics

Transform images into musical soundscapes using a TypeScript monorepo built with Turborepo. The repository contains a Next.js web studio, a Fastify API, shared audio/image processing packages, and an Expo mobile proof of concept.

## Current State
- **Web (Next.js 14)**: Landing page, studio workspace, composition browser, Tone.js playback, MIDI export, and demo compositions.
- **API (Fastify)**: Health endpoints and Supabase-backed composition CRUD routes. Requires environment variables to connect to a live Supabase project.
- **Shared packages**: `@toposonics/core-image` (brightness/depth/ridge analysis), `@toposonics/core-audio` (linear landscape mapping and partial depth-ridge support), `@toposonics/types`, and `@toposonics/ui`.
- **Mobile (Expo 50)**: Navigation and API wiring are in place; pixel extraction and audio playback remain TODOs. Serves as a reference for consuming the shared packages.

## Workspace Layout
```
apps/
  web/      Next.js frontend (App Router, Tone.js)
  api/      Fastify API with Supabase integration
  mobile/   Expo demo app (foundation for full mobile experience)

packages/
  core-image/  Image analysis utilities (environment-agnostic)
  core-audio/  Image-to-music mapping utilities
  ui/          Shared React component library
  types/       Shared TypeScript contracts
```

## Getting Started
### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Install Dependencies
```bash
pnpm install
```

### Environment Configuration
Create environment files based on the provided examples:
- `apps/web/.env.local` – `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `apps/api/.env` – Supabase keys and API port (see `apps/api/.env.example`)
- `apps/mobile/.env` – `EXPO_PUBLIC_API_URL` for mobile clients

### Run Applications
```bash
# Web studio (http://localhost:3000)
pnpm dev:web

# API server (http://localhost:3001)
pnpm dev:api

# Mobile (Expo dev server)
cd apps/mobile && pnpm dev
```

## Features by Package
- **core-image**: Brightness profiling, simple depth estimation, ridge detection helpers, Sobel edge utilities, and quick analyzers for previews.
- **core-audio**: Linear landscape mapping from brightness to pitched note events, scale/key helpers, preset management, and experimental depth-ridge mapping utilities.
- **web**: Image upload and analysis, mapping controls, timeline visualization, Tone.js playback controls, composition saving/browsing, and MIDI export.
- **api**: Health routes, Supabase-authenticated composition CRUD, CORS and HTTPS enforcement, and rate limiting.
- **mobile**: Demonstrates navigation and shared package imports; audio synthesis and pixel extraction are stubbed for future work.

## Testing
Manual end-to-end scenarios are documented in [TESTING.md](./TESTING.md), covering API health checks, web studio flows (upload, generate, playback, save), and mobile navigation.

## Roadmap Snapshot
- [x] Monorepo structure with shared packages
- [x] Web studio with Tone.js playback and MIDI export
- [x] Fastify API routes for compositions (Supabase-backed)
- [ ] Mobile audio pipeline and pixel extraction
- [ ] Advanced depth/ridge mapping and additional synthesis engines
- [ ] Collaborative features and richer visualization

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and workspace conventions.
