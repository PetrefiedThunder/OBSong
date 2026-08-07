# Project Context

## Tech Stack Manifest

- **Node.js:** 20.19.4+ (per `engines`; mirrors React Native 0.86's requirement of
  `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25` — note 21.x and 23.x are excluded)
- **Next.js:** 15.5.18
- **Expo:** 57.0.11
- **React Native:** 0.86.2
- **Fastify:** 5.8.5
- **Tone.js:** ^14.7.77

## Monorepo Map

```
apps/
  api/ (Fastify API service; depends on @toposonics/types plus Fastify and Supabase)
  web/ (Next.js frontend; imports @toposonics/ui, @toposonics/core-audio, @toposonics/core-image, @toposonics/shared, @toposonics/types)
  mobile/ (Expo client; imports @toposonics/core-audio, @toposonics/core-image, @toposonics/native-image-processing, @toposonics/shared, @toposonics/types)

packages/
  core-image/ (image feature extraction; consumed by web and mobile mapping flows)
  core-audio/ (composition mapping and note generation; consumes @toposonics/types)
  native-image-processing/ (native Android image-processing bridge used by mobile)
  shared/ (shared config, API helpers, and logging; depends on @toposonics/types)
  ui/ (shared UI kit used by the web app)
  types/ (shared contracts; imported by all other workspaces; does not import from apps)
```

> Dependency flow: Web and Mobile consume the core packages; API consumes shared types only; Shared consumes Types; Types has no upstream dependencies.

## Data Flow

1. **core-image** analyzes source visuals to produce `ImageAnalysisResult` data.
2. **core-audio** consumes `ImageAnalysisResult`, maps it into `NoteEvent` collections, and prepares compositions for playback/export.
3. **web** plays generated compositions with Tone.js and handles MIDI export plus authenticated save flows.
4. **mobile** supports authenticated browsing on both platforms and Android-only on-device generation in the editor.
