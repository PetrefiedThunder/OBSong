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

> **⚠️ IMPORTANT:** This project requires **pnpm** (NOT npm or yarn). Using npm will fail.

```bash
node --version   # >= 18.0.0 required
pnpm --version   # >= 8.0.0 required (install if missing: npm install -g pnpm@8.15.0)
```

**If you don't have pnpm installed:**

```bash
# Install pnpm globally using npm
npm install -g pnpm@8.15.0

# Verify installation
pnpm --version
```

### Environment Configuration

Create `.env` files based on `.env.example`:

**apps/web/.env.local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**apps/api/.env:**
```bash
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**apps/mobile/.env** (used by Expo for builds and local development):
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**apps/mobile/src/config.ts:**
```typescript
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const API_URL = env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
```

### Installation

```bash
# ⚠️ DO NOT use npm install - it will fail!
# This project requires pnpm

# Install all workspace dependencies
pnpm install

# Build shared packages
pnpm build
```

### Troubleshooting Installation Issues

#### "npm install" fails or hangs

**Problem:** You're using npm instead of pnpm.

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm@8.15.0

# Then use pnpm instead
pnpm install
```

#### "command not found: pnpm"

**Problem:** pnpm is not installed on your system.

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm@8.15.0

# Verify it's installed
pnpm --version  # Should show 8.15.0 or higher
```

#### "This project requires pnpm" error when running npm commands

**Problem:** The project has safeguards to prevent using npm.

**Solution:** This is expected behavior. Install and use pnpm as shown above.

#### Workspace dependencies not resolving

**Problem:** pnpm workspace symlinks may not be created.

**Solution:**
```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
rm pnpm-lock.yaml  # Only if you have persistent issues
pnpm install
pnpm build
```

### Development

```bash
# Run individual apps (recommended for development)
pnpm dev:api      # Start Fastify API on :3001
pnpm dev:web      # Start Next.js dev server on :3000
pnpm dev:mobile   # Start Expo dev server

# Or run all concurrently
pnpm dev:all
```

### Production Build

```bash
# Build all apps and packages
pnpm build

# Build individually
pnpm build:web
pnpm build:api
pnpm build:mobile  # Note: Mobile requires EAS Build for production
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Format code with Prettier
pnpm format

# Type checking
pnpm typecheck
```

---

## 🎹 Usage Guide

### Web Application (`http://localhost:3000`)

1. **Sign In:** Create account or sign in with email/password
2. **Select Scene Pack:** Choose from Nature, Urban, or Atmospheric presets
3. **Upload Image:** Drag & drop or browse for a landscape photo
4. **Configure Parameters:**
   - Key & Scale (e.g., C Major, A Minor, D Dorian)
   - Mapping Mode (Linear Landscape or Depth Ridge)
   - Tempo (40-200 BPM)
5. **Generate Composition:** Click "Generate Composition" to analyze and map
6. **Playback:** Use transport controls to play/stop
7. **Export:** Save to library or download as MIDI file

**Scanline Feature:** During playback, a vertical line sweeps across the image showing the current playback position.

### Mobile Application (iOS/Android)

1. **Launch Expo Go:** Scan QR code from `pnpm dev:mobile`
2. **Sign In:** Use "Sign in with Apple" (iOS) or email/password
3. **Camera/Gallery:** Capture new photo or select from gallery
4. **View Compositions:** Browse saved compositions with offline support
5. **Offline Mode:** Cached compositions available when API is unreachable
6. **Pull to Refresh:** Sync with server when back online

### API Endpoints (`http://localhost:3001`)

**Authentication:**
```http
POST /auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

**Compositions:**
```http
GET    /compositions              # List all (requires auth)
POST   /compositions              # Create new (requires auth)
GET    /compositions/:id          # Get by ID (requires auth)
PUT    /compositions/:id          # Update (requires auth)
DELETE /compositions/:id          # Delete (requires auth)
```

**Headers:**
```http
Authorization: Bearer <supabase_access_token>
```

---

## 🧪 Image Analysis Pipeline

### Core Algorithm Flow

```typescript
// 1. Image Input (Web: Canvas, Mobile: expo-image-manipulator)
const pixels: Uint8ClampedArray = imageData.data; // RGBA array
const { width, height } = imageData;

// 2. Analysis Mode Selection
const analysis = analyzeImageForDepthRidge(pixels, width, height);
// OR
const analysis = analyzeImageForMultiVoice(pixels, width, height);

// 3. Feature Extraction
interface ImageAnalysisResult {
  brightnessProfile: number[];    // Luminance values (0-255)
  ridgeStrength: number[];        // Sobel edge magnitudes (0-1)
  depthProfile: number[];         // Contrast-based depth (0-1)
  horizonProfile: number[];       // Contour heights (0-1)
  textureProfile: number[];       // Local variance (0-1)
}

// 4. Musical Mapping
const noteEvents = mapDepthRidge(analysis, {
  key: 'C',
  scale: 'C_MAJOR',
  ridgeThreshold: 0.5,  // Only create notes at strong edges
});

// 5. Playback (Web: Tone.js, Mobile: expo-av)
```

### Sobel Edge Detection Implementation

The **DEPTH_RIDGE** mode uses a proper Sobel operator:

```typescript
// Sobel kernels for horizontal (Gx) and vertical (Gy) gradients
const Gx = [-1,  0,  1,
            -2,  0,  2,
            -1,  0,  1];

const Gy = [-1, -2, -1,
             0,  0,  0,
             1,  2,  1];

// Gradient magnitude at each pixel
magnitude = √(Gx² + Gy²)

// Musical mapping: Higher magnitude = stronger note emphasis
velocity = 0.6 + (edgeMagnitude * 0.4)
duration = baseDuration * (1 + edgeMagnitude * 0.5)
```

---

## 📊 Data Models

### Composition Schema

```typescript
interface Composition {
  id: string;                    // UUID
  userId: string;                // Foreign key to auth.users
  title: string;                 // User-defined name
  description?: string;          // Optional notes

  // Musical parameters
  noteEvents: NoteEvent[];       // Array of musical events
  key: KeyType;                  // 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B' | ...
  scale: ScaleType;              // 'C_MAJOR' | 'A_MINOR' | ...
  tempo: number;                 // BPM (40-200)
  mappingMode: MappingMode;      // 'LINEAR_LANDSCAPE' | 'DEPTH_RIDGE' | 'MULTI_VOICE'

  // Metadata
  presetId?: string;             // Associated TopoPreset
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    duration?: number;           // Total duration in seconds
    noteCount?: number;          // Total note events
    imageSource?: string;        // Original image metadata
  };
}
```

### Note Event Schema

```typescript
interface NoteEvent {
  note: string;                  // Scientific notation: 'C4', 'A#5', etc.
  start: number;                 // Start time in beats
  duration: number;              // Duration in beats
  velocity: number;              // 0-1 (MIDI 0-127 normalized)
  pan?: number;                  // -1 (left) to 1 (right)
  trackId?: string;              // Voice identifier: 'bass' | 'melody' | 'pad' | 'fx'
  effects?: {
    reverbSend?: number;         // 0-1 wet mix
    filterCutoff?: number;       // 0-1 normalized frequency
    delayTime?: number;          // Seconds
  };
}
```

---

## 🎨 Mapping Modes Explained

### LINEAR_LANDSCAPE

**Best for:** Simple melodic lines, horizon-following compositions

**Algorithm:**
1. Extract brightness profile from image center (5-row average)
2. Downsample to target note count (default: 64 notes)
3. Map each brightness value to scale degree (darker = lower pitch)
4. Apply sequential timing with consistent note durations
5. Modulate velocity by brightness intensity
6. Pan notes left-to-right based on horizontal position

**Musical Result:** Single-voice melody that traces the visual contour

### DEPTH_RIDGE

**Best for:** Percussive accents, emphasizing visual features

**Algorithm:**
1. Apply **Sobel edge detection** to full 2D image
2. Extract edge strength profile along horizontal center
3. Create notes only where edge strength exceeds threshold
4. Boost velocity at strong edges (percussive emphasis)
5. Extend note duration at ridges (sustained accents)
6. Depth profile controls reverb amount (far = wet)

**Musical Result:** Sparse, accent-driven composition highlighting visual edges

### MULTI_VOICE

**Best for:** Full soundscapes, layered compositions

**Algorithm (per voice):**
- **Bass:** Maps horizon contour to low notes (C2-C3, 3-beat durations)
- **Melody:** Maps ridge strength to high notes (C4-C6, triggered by edges)
- **Pad:** Maps texture variance to chord complexity (dyads → triads → 7ths)
- **FX:** (Reserved for future spatial audio features)

**Musical Result:** Multi-layered composition with harmonic and rhythmic depth

---

## 🔧 Package API Reference

### `@toposonics/core-image`

**Environment-agnostic image analysis (no DOM/Canvas dependencies)**

```typescript
// Primary analyzers
export function analyzeImageForLinearLandscape(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options?: AnalysisOptions
): ImageAnalysisResult;

export function analyzeImageForDepthRidge(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { ridgeThreshold?: number; smoothingWindow?: number; }
): ImageAnalysisResult;

export function analyzeImageForMultiVoice(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { maxSamples?: number; horizonSmoothing?: number; }
): ImageAnalysisResult;

// Sobel edge detection (NEW)
export function applySobelEdgeDetection(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): number[]; // Edge magnitudes (0-1)

export function extractEdgeProfile(
  edgeMagnitudes: number[],
  width: number,
  height: number,
  options?: { rowIndex?: number; averageRows?: boolean; }
): number[]; // 1D edge profile
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
