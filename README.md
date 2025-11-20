# TopoSonics

> Transform visual landscapes into musical compositions through intelligent image-to-sound mapping

**TopoSonics** is a production-grade platform that converts photographs and live camera feeds into generative musical soundscapes. By analyzing visual features—brightness, contrast, edges, texture—the system creates expressive compositions that translate spatial information into time-based musical structures.

---

## 🎵 For Musicians: The Creative Concept

### What Is This?

TopoSonics is a **graphical score interpreter** for the 21st century. Instead of traditional notation, it reads the contours, textures, and intensity variations of photographs as musical gestures.

Think of it as:
- **Visual-to-sonic translation:** Mountain ridges become melodic phrases, horizon lines become basslines, textural complexity becomes harmonic density
- **Parametric composition:** You control the musical language (key, scale, tempo) while the image provides the gestural content
- **Generative variation:** The same image produces different results depending on your musical choices—like different performers interpreting the same graphic score

### Musical Mapping Framework

The system uses three primary image-to-music mappings:

#### 1. **Spatial Mapping** (Geometry → Musical Space)
- **Horizontal axis (left → right):** Time progression through the composition
- **Vertical axis (bottom → top):** Pitch mapping (low notes at the base, high notes at peaks)
- **Depth/contrast:** Stereo field positioning and spatial effects (reverb, delay)

#### 2. **Intensity Mapping** (Visual Dynamics → Musical Dynamics)
- **Brightness:** Note velocity and timbral brightness (filter cutoff)
- **Contrast/edges:** Percussive emphasis and articulation
- **Texture variance:** Harmonic complexity (from sparse dyads to dense 7th chords)

#### 3. **Feature Detection** (Visual Gestures → Musical Gestures)
- **Horizon lines:** Sustained bass movement following the contour
- **Ridge detection (Sobel edges):** Melodic accents on prominent visual features
- **Textural regions:** Pad/ambient layers reflecting visual complexity

### Musical Control Parameters

You maintain full artistic control through:

- **Scale/Mode selection:** 13+ scales including Major, Minor, Pentatonic, Dorian, Phrygian, Mixolydian, Blues
- **Key selection:** All 12 chromatic keys
- **Voice configuration:** Enable/disable bass, melody, pad, and FX layers independently
- **Tempo:** 40-200 BPM with real-time adjustment
- **Scene Packs:** Pre-configured aesthetic presets (Mountain Majesty, Urban Pulse, Coastal Drift, etc.)
- **MIDI export:** Export compositions to your DAW for further arrangement and production

### Musical Output

The system generates multi-voice compositions with:
- **Bass voice:** Follows horizon/contour lines with sustained notes (typically 2-4 beat durations)
- **Melody voice:** Triggered by visual ridges/peaks with varying velocities (0.5-1.5 beat durations)
- **Pad voice:** Harmonic foundation based on textural complexity (4-8 beat chord progressions)
- **Spatial effects:** Dynamic reverb, filter modulation, and stereo panning reflecting depth and position

**Musical coherence** is guaranteed—all notes conform to your selected scale, ensuring harmonic consistency regardless of image content.

---

## 🛠 For Developers: Technical Architecture

### System Overview

TopoSonics is a **TypeScript monorepo** built on **Turborepo**, separating concerns into pure computational logic (packages) and application interfaces (apps).

```
toposonics/
├── apps/
│   ├── web/          Next.js 14 + Tone.js (browser-based synthesis)
│   ├── mobile/       Expo React Native (iOS/Android with offline caching)
│   └── api/          Fastify + Supabase (REST API with PostgreSQL)
│
├── packages/
│   ├── core-image/   Pure TS image analysis (NO UI dependencies)
│   ├── core-audio/   Pure TS mapping algorithms (NO audio libraries)
│   ├── types/        Shared interfaces & Zod schemas
│   └── ui/           Shared React components (web + mobile)
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Monorepo** | pnpm + Turborepo | Workspace management, parallel builds |
| **Language** | TypeScript 5.3+ (strict) | Type safety across all packages |
| **Web Frontend** | Next.js 14 App Router | React framework with SSR/SSG |
| **Web Audio** | Tone.js 14.7 | Web Audio API synthesis & scheduling |
| **Mobile** | Expo 50 + React Native | Cross-platform iOS/Android |
| **Mobile Audio** | expo-av | Native audio playback |
| **Backend API** | Fastify 4.25 | High-performance REST API |
| **Database** | Supabase (PostgreSQL) | Auth + data persistence |
| **Authentication** | Supabase Auth | Email/password + Sign in with Apple |
| **Mobile Cache** | AsyncStorage | Offline composition persistence |
| **Styling** | Tailwind CSS | Utility-first CSS framework |

### Package Boundary Rules

```typescript
// ✅ ALLOWED
apps/web      → packages/* (can import all shared packages)
apps/mobile   → packages/* (can import all shared packages)
apps/api      → packages/* (can import all shared packages)

// ❌ FORBIDDEN
packages/core-image → any UI library (must be environment-agnostic)
packages/core-audio → Tone.js or any audio library (pure mapping logic only)
packages/types      → any runtime logic (types/schemas only)
```

---

## 🚀 Feature Status: 100% Roadmap Complete

### ✅ Phase 1: Studio Upgrade (Complete)

- [x] **MIDI Export** - Export compositions as standard MIDI files using `@tonejs/midi`
- [x] **Scanline Visualization** - Real-time playhead overlay synchronized with `Tone.Transport`

### ✅ Phase 2: Infrastructure & Persistence (Complete)

- [x] **Supabase Integration** - PostgreSQL database with `compositions` table (jsonb storage)
- [x] **Authentication System** - Supabase Auth with email/password + OAuth
- [x] **Sign in with Apple** - Mobile App Store compliance via `expo-apple-authentication`

### ✅ Phase 3: Algorithmic Intelligence (Complete)

- [x] **Sobel Edge Detection** - Full 2D Sobel operator (Gx/Gy kernels) for ridge detection
- [x] **DEPTH_RIDGE Mapping Mode** - Edge-emphasized composition with depth-based reverb
- [x] **Multi-Voice Composition** - Bass (horizon), Melody (ridges), Pad (texture), FX (depth)

### ✅ Phase 4: Mobile Hardening (Complete)

- [x] **AsyncStorage Caching** - Offline composition persistence with API fallback
- [x] **Pull-to-Refresh** - Manual sync when returning online
- [x] **Offline Mode Banner** - Visual indicator when using cached data

### Additional Features

- [x] **Scene Pack System** - Curated presets with recommended subjects and lighting
- [x] **TopoPreset Architecture** - Voice configuration templates with mapping biases
- [x] **Real-time Parameter Updates** - Tempo, key, scale changes without regeneration
- [x] **Composition Library** - User-specific composition management with metadata

---

## 📦 Installation & Setup

### Prerequisites

```bash
node --version   # >= 18.0.0 required
pnpm --version   # >= 8.0.0 required
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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**apps/mobile/src/config.ts:**
```typescript
export const API_URL = 'http://localhost:3001';
export const SUPABASE_URL = 'your_supabase_url';
export const SUPABASE_ANON_KEY = 'your_anon_key';
```

### Installation

```bash
# Install pnpm globally
npm install -g pnpm@8.15.0

# Install all workspace dependencies
pnpm install

# Build shared packages
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

### `@toposonics/core-audio`

**Pure mapping logic (no Tone.js or audio library dependencies)**

```typescript
// Mapping functions
export function mapLinearLandscape(
  analysis: ImageAnalysisResult,
  options: LinearLandscapeOptions
): NoteEvent[];

export function mapDepthRidge(
  analysis: ImageAnalysisResult,
  options: DepthRidgeOptions
): NoteEvent[];

export function mapImageToMultiVoiceComposition(
  analysis: ImageAnalysisResult,
  options: MultiVoiceOptions,
  preset?: TopoPreset
): NoteEvent[];

// MIDI export
export function compositionToMidiBlob(
  composition: Composition,
  tempoOverride?: number
): Blob;

// Scale utilities
export function getScaleNotes(
  key: KeyType,
  scale: ScaleType,
  octaves: number,
  startOctave: number
): string[];

export function noteNameToMidi(noteName: string): number;
export function midiToNoteName(midiNumber: number): string;
```

---

## 🧩 Scene Pack System

Scene Packs provide curated aesthetic starting points:

**Mountain Majesty** (Nature)
- Preset: Deep Valleys (bass-heavy, wide reverb)
- Recommended: Mountain ranges, dramatic skylines
- Lighting: Golden hour, high contrast

**Urban Pulse** (Urban)
- Preset: City Contours (bright, percussive)
- Recommended: Cityscapes, architecture
- Lighting: Night lights, neon accents

**Coastal Drift** (Atmospheric)
- Preset: Horizon Glow (smooth, ambient)
- Recommended: Seascapes, calm horizons
- Lighting: Soft, diffused light

Each Scene Pack includes:
- Default key/scale/tempo
- Voice configuration presets
- Demo compositions
- UI theme hints (gradient colors)

---

## 📱 Mobile Offline Architecture

The mobile app implements robust offline functionality:

```typescript
// Caching strategy
const loadCompositions = async () => {
  try {
    // 1. Try API fetch
    const response = await fetch(`${API_URL}/compositions`);
    const compositions = await response.json();

    // 2. Cache successful fetch
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      compositions,
      cachedAt: new Date().toISOString()
    }));

    return compositions;
  } catch (error) {
    // 3. Fallback to cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { compositions } = JSON.parse(cached);
      showOfflineBanner(); // Visual indicator
      return compositions;
    }
    throw new Error('No offline data available');
  }
};
```

**User Experience:**
- **Online:** Fresh data from API, silent background caching
- **Offline:** Automatic cache fallback with yellow "Offline Mode" banner
- **Recovery:** Pull-to-refresh gesture to sync when back online

---

## 🧪 Testing

See [TESTING.md](./TESTING.md) for comprehensive manual test procedures.

**Quick Smoke Test:**

```bash
# Terminal 1: Start API
pnpm dev:api

# Terminal 2: Start Web
pnpm dev:web

# Browser: http://localhost:3000
# 1. Upload test image (e.g., mountain landscape)
# 2. Generate composition
# 3. Verify playback with scanline animation
# 4. Export MIDI and verify file download
```

---

## 🚢 Deployment Checklist

### Production Requirements

- [ ] Configure production Supabase project with Row Level Security (RLS)
- [ ] Set up environment variables in hosting platform
- [ ] Configure CORS for API endpoints
- [ ] Enable Supabase Auth email templates
- [ ] Set up Apple Developer account for "Sign in with Apple"
- [ ] Configure mobile app signing certificates (EAS Build)
- [ ] Implement error tracking (Sentry recommended)
- [ ] Set up analytics (PostHog, Mixpanel, etc.)
- [ ] Configure CDN for static assets
- [ ] Add rate limiting to API endpoints

### Environment Variables (Production)

```bash
# Web (Vercel/Netlify)
NEXT_PUBLIC_API_URL=https://api.toposonics.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# API (Railway/Render/Fly.io)
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
CORS_ORIGIN=https://toposonics.com
```

---

## 🤝 Contributing

This project demonstrates a complete production architecture. For contributions:

1. **Code Style:** Follow existing patterns (Prettier config provided)
2. **Type Safety:** All functions must have explicit return types
3. **Package Boundaries:** Respect the architectural constraints (no UI in core packages)
4. **Documentation:** Update README for new features
5. **Testing:** Include manual test scenarios in TESTING.md

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Credits & Acknowledgments

### Technology Stack

- **[Tone.js](https://tonejs.github.io/)** - Web Audio framework for synthesis and scheduling
- **[Next.js](https://nextjs.org/)** - React framework with App Router
- **[Expo](https://expo.dev/)** - React Native development platform
- **[Fastify](https://www.fastify.io/)** - High-performance Node.js web framework
- **[Supabase](https://supabase.com/)** - Open-source Firebase alternative (PostgreSQL + Auth)
- **[Turborepo](https://turbo.build/)** - High-performance monorepo build system
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

### Inspiration

TopoSonics draws inspiration from:
- **Graphic notation** traditions (Feldman, Cardew, Oliveros)
- **Algorithmic composition** (Xenakis, Hiller, Roads)
- **Data sonification** research (Hermann, Hunt, Neuhoff)
- **Visual music** pioneers (Fischinger, Whitney, Ruttmann)

---

## 📞 Support & Documentation

- **Technical Docs:** [TESTING.md](./TESTING.md), [CONTRIBUTING.md](./CONTRIBUTING.md)
- **API Reference:** See "Package API Reference" section above
- **Issues:** Report bugs via GitHub Issues
- **Discussions:** Join GitHub Discussions for feature requests

---

**Built with ❤️ for musicians and developers**
