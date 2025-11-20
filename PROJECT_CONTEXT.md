# Project Context

## Tech Stack Manifest
- **Node.js:** 18.x (development currently using v22.21.0 for tooling compatibility)
- **Next.js:** 14.2.32
- **Expo:** 50.0.0
- **Tone.js:** 14.7.77

## Monorepo Map
```
apps/
  api/ (service layer; depends on @toposonics/core-audio, @toposonics/core-image, @toposonics/types)
  web/ (Next.js frontend; imports @toposonics/ui, @toposonics/core-audio, @toposonics/core-image, @toposonics/types)
  mobile/ (Expo client; imports @toposonics/core-audio, @toposonics/core-image, @toposonics/types)

packages/
  core-image/ (image feature extraction; consumed by core-audio and UI clients)
  core-audio/ (audio synthesis and mapping; consumes outputs from core-image)
  ui/ (shared UI kit; depends on @toposonics/types and may consume helpers from core-audio)
  types/ (shared contracts; imported by all other workspaces; does not import from apps)
```
> Dependency flow: Web and Mobile consume Core-Image and Core-Audio; Core-Audio consumes Core-Image; UI consumes Types and Core-Audio helpers; Types has no upstream dependencies.

## Data Flow
1. **core-image** analyzes source visuals to produce `ImageAnalysisResult` data.
2. **core-audio** consumes `ImageAnalysisResult`, maps it into `NoteEvent` collections, and applies synthesis presets.
3. **ui** surfaces the audio and mapping controls, displaying analysis outputs and triggering playback via the generated note events.
