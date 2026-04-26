# Quick Start Guide for macOS

This guide gets the current TopoSonics v1 running locally on a Mac.

## Prerequisites

### 1. Install Node.js 20+

```bash
brew install node@20
node --version
```

### 2. Enable pnpm 8.15.0 via Corepack

```bash
corepack enable
corepack prepare pnpm@8.15.0 --activate
pnpm --version
```

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong
```

### 2. Install dependencies

```bash
corepack pnpm install
```

### 3. Configure env files

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

If you want authenticated save/library flows, fill in the Supabase values in the web and API env files.

## Run the apps

### Option A: separate terminals

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:mobile
```

### Option B: use the root scripts you prefer

```bash
corepack pnpm dev:api
corepack pnpm dev:web
```

The main web app runs at `http://localhost:3000`.

## Demo Flow

### Public web flow

1. Open `http://localhost:3000`
2. Explore the landing page demos
3. Open the studio
4. Upload an image
5. Try all three mapping modes
6. Play the result and export MIDI

### Authenticated web flow

1. Sign in with Supabase-backed auth
2. Generate a composition in the studio
3. Save it to the private library
4. Open `/compositions`
5. Replay the saved composition

### Mobile flow

- **Android**: supports pick/capture -> generate -> preview -> save
- **iOS**: supports browsing/sign-in/detail flows, but generation is intentionally unavailable in this release

## Product Notes

- `/compositions` is a private library, not a public gallery
- Public/demo discovery is limited to the landing page and static demo content
- Web supports `LINEAR_LANDSCAPE`, `DEPTH_RIDGE`, and `MULTI_VOICE`
- Mobile generation currently supports `LINEAR_LANDSCAPE` only

## Validation

Run:

```bash
corepack pnpm typecheck
corepack pnpm test
```

For manual QA, use [TESTING.md](TESTING.md).
