# TopoSonics Testing Guide

Manual test procedures for the current v1 contract.

## Prerequisites

Before testing:

1. Run `corepack enable`
2. Run `corepack prepare pnpm@8.15.0 --activate`
3. Run `corepack pnpm install`
4. Start the API with `corepack pnpm dev:api`
5. Start the web app with `corepack pnpm dev:web`
6. Optionally start mobile with `corepack pnpm dev:mobile`
7. Configure env files from the provided examples if you need authenticated flows

## Build Health

Run these before manual QA:

```bash
corepack pnpm typecheck
corepack pnpm test
```

## Web Acceptance

### 1. Studio Upload and Analysis

1. Open `http://localhost:3000/studio`.
2. Upload an image.
3. Verify the preview renders.
4. Switch between `LINEAR_LANDSCAPE`, `DEPTH_RIDGE`, and `MULTI_VOICE`.
5. Confirm analysis reruns when the mapping mode changes.

Pass criteria:

- Upload succeeds without console errors
- Preview renders correctly
- Mode switches trigger fresh analysis

### 2. Generation by Mapping Mode

1. Use the same image in the studio.
2. Generate once with each mapping mode.
3. Compare the timeline output and audible result.

Pass criteria:

- `LINEAR_LANDSCAPE` produces a valid composition
- `DEPTH_RIDGE` produces a distinct valid composition
- `MULTI_VOICE` produces a distinct valid composition
- No generation path silently falls back to another mode

### 3. Playback and MIDI Export

1. Generate a composition.
2. Click play.
3. Verify audio starts and stops correctly.
4. Export MIDI.

Pass criteria:

- Playback works without uncaught errors
- Stop halts playback immediately
- MIDI export produces a file successfully

### 4. Auth Gating for Library

1. Sign out.
2. Visit `http://localhost:3000/compositions`.
3. Visit a direct detail URL such as `http://localhost:3000/compositions/<id>`.

Pass criteria:

- Both routes show a sign-in call to action
- Neither route attempts anonymous library browsing as the main UX

### 5. Authenticated Save and Replay

1. Sign in through the web UI.
2. Generate a composition in the studio.
3. Save it with a title and description.
4. Open `/compositions`.
5. Open the saved item detail page.
6. Replay it.
7. Delete it if your flow supports cleanup.

Pass criteria:

- Save succeeds for an authenticated user
- Library list shows the saved item
- Detail page loads and replays correctly

## Mobile Acceptance

### 6. Navigation

1. Launch the Expo app.
2. Navigate Home -> Editor -> Home.
3. Navigate Home -> Compositions -> Detail.

Pass criteria:

- Navigation works without crashes

### 7. Android Generation Flow

1. Run on Android.
2. Open the editor.
3. Pick or capture an image.
4. Generate a composition.
5. Preview playback.
6. Save the composition.

Pass criteria:

- Android can complete pick/capture -> generate -> preview -> save

### 8. iOS Unsupported-State Flow

1. Run on iOS.
2. Open the editor.
3. Pick an image.
4. Inspect the generate section.
5. Attempt to generate.

Pass criteria:

- The editor clearly states generation is Android-only
- The generate action is disabled or safely blocked
- iOS does not crash and does not call into the unavailable native path

### 9. Mobile Library Flow

1. Sign in on mobile.
2. Open the compositions list.
3. Open a saved composition detail.

Pass criteria:

- Authenticated library/detail flows work on both platforms

## Regression Checks

- Landing-page static demos still load
- `@toposonics/core-image` tests remain green
- `@toposonics/core-audio` tests remain green
- No workspace package is imported through `dist/*`

## Known Intentional Limits

- Web library is private-only in v1
- Mobile generation is Android-only in v1
- Mobile playback is a simplified preview path
