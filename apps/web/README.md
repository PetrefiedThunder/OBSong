# @toposonics/web

Next.js 15 web application for TopoSonics.

## What It Does

- Uploads an image and analyzes it in the browser
- Generates note events with three supported mapping modes:
  - `LINEAR_LANDSCAPE`
  - `DEPTH_RIDGE`
  - `MULTI_VOICE`
- Plays compositions with Tone.js
- Exports generated note events as MIDI
- Saves and replays private compositions through the API

## Routes

- `/` public landing page with static demos
- `/studio` composition workspace
- `/compositions` authenticated private library
- `/compositions/[id]` authenticated private composition detail

## Development

```bash
corepack pnpm install
corepack pnpm dev:web
```

The app runs at `http://localhost:3000`.

## Environment

Create `apps/web/.env.local` from the example file:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Typical values:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Auth and Library Behavior

- The web app uses Supabase session auth.
- Anonymous users can use the landing page and studio.
- Saving a composition requires sign-in.
- The library and composition detail routes show a sign-in call to action instead of attempting anonymous fetches.

## Mapping Flow

1. User selects an image in the studio.
2. The selected file is stored in state.
3. Analysis is recomputed whenever the file or mapping mode changes.
4. Generation uses the matching mapper:
   - `LINEAR_LANDSCAPE` -> `mapLinearLandscape`
   - `DEPTH_RIDGE` -> `mapDepthRidge`
   - `MULTI_VOICE` -> `mapImageToMultiVoiceComposition`

## Key Pieces

- `src/app/studio/page.tsx` coordinates upload, analysis, generation, playback, and save flow.
- `src/lib/imageProcessing.ts` contains browser-side image analysis helpers.
- `src/components/LoginModal.tsx` provides the shared sign-in modal.
- `src/hooks/useToneEngine.ts` handles browser playback.

## Validation

```bash
corepack pnpm --filter @toposonics/web typecheck
```

## Known Limits

- Safari still requires a user gesture before audio playback.
- The landing page demos are static samples, not library-backed public content.
- Live camera input is not part of this release.

## License

MIT
