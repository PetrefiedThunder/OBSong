# TopoSonics

> Turn static photos or live camera input into rich musical landscapes

TopoSonics is a full-stack application that transforms visual imagery (mountains, city skylines, grass, objects) into generative musical compositions. By mapping spatial and intensity data to musical parameters, it creates unique soundscapes from any image.

## Core Concept

**Mapping Methodology:**

- **Horizontal (left → right):** Time progression through the composition
- **Vertical (bottom → top):** Pitch mapping (low to high notes)
- **Intensity/depth/contrast:** Controls:
  - Stereo panning (left/right positioning)
  - Filter cutoff & brightness
  - Reverb send & spatial depth

**User Controls:**

- Musical key and scale selection (C Major, A Minor, Pentatonic, etc.)
- Instrument/synth preset selection
- Mapping mode (Linear Landscape, Depth-based Ridge detection)
- Playback tempo and effects parameters

## Architecture

```
toposonics/
├── apps/
│   ├── web/          Next.js 14 web app (browser-based with Tone.js)
│   ├── mobile/       Expo React Native app (iOS & Android)
│   └── api/          Fastify backend API (Node + TypeScript)
│
├── packages/
│   ├── core-image/   Image analysis & feature extraction
│   ├── core-audio/   Image → NoteEvent mapping logic
│   ├── types/        Shared TypeScript types & interfaces
│   └── ui/           Shared design tokens & components
│
└── [config files]    Turborepo, ESLint, Prettier, TypeScript
```

### Technology Stack

- **Monorepo:** pnpm + Turborepo
- **Language:** TypeScript (strict mode)
- **Web:** Next.js 14 (App Router), Tailwind CSS, Tone.js
- **Mobile:** Expo, React Native, React Navigation
- **Backend:** Fastify, Prisma (or in-memory)
- **Audio:** Tone.js (web), expo-av (mobile)

## Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install pnpm if you don't have it
npm install -g pnpm@8.15.0

# Install all dependencies
pnpm install
```

### Development

Run individual applications:

```bash
# Run the API server
pnpm dev:api

# Run the web app (in a new terminal)
pnpm dev:web

# Run the mobile app (in a new terminal)
pnpm dev:mobile
```

Or run everything at once:

```bash
pnpm dev:all
```

### Building

```bash
# Build all apps
pnpm build

# Build specific apps
pnpm build:web
pnpm build:api
pnpm build:mobile
```

### Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Format all code
pnpm format

# Check formatting
pnpm format:check
```

## Usage

### Web App

1. Navigate to `http://localhost:3000` (default Next.js port)
2. Upload an image or use your camera
3. Select musical parameters (key, scale, preset)
4. Click "Generate & Play" to hear your visual soundscape
5. Save compositions to the backend for later playback

### Mobile App

1. Start the Expo dev server with `pnpm dev:mobile`
2. Scan the QR code with Expo Go (iOS/Android)
3. Capture or pick an image from your gallery
4. Adjust musical parameters
5. Generate and listen to your composition
6. View saved compositions from the API

### API

The backend API runs on `http://localhost:3001` (configurable) and provides:

- **GET** `/health` - Health check
- **POST** `/auth/login` - Pseudo-authentication (dev mode)
- **GET** `/compositions` - List all compositions
- **POST** `/compositions` - Create new composition
- **GET** `/compositions/:id` - Get specific composition
- **PUT** `/compositions/:id` - Update composition
- **DELETE** `/compositions/:id` - Delete composition

## Project Structure

### Shared Packages

#### `@toposonics/types`

TypeScript interfaces and types used across all apps:

- `ImageAnalysisResult` - Output from image processing
- `NoteEvent` - Musical note with timing, pitch, and effects
- `Composition` - Full composition data model
- `MappingMode`, `ScaleType`, `KeyType` - Enums and unions

#### `@toposonics/core-image`

Environment-agnostic image analysis utilities:

- `analyzeImageForLinearLandscape()` - Extract brightness & depth profiles
- `computeBrightnessProfileFromRow()` - Per-row brightness analysis
- `computeSimpleDepthProfile()` - Depth estimation from contrast

#### `@toposonics/core-audio`

Mapping logic from image features to musical events:

- `mapLinearLandscape()` - Primary mapping mode (brightness → pitch)
- `getScaleNotes()` - Generate note arrays for any key/scale
- `brightnessToScaleIndex()` - Map brightness values to scale degrees

#### `@toposonics/ui`

Shared design tokens and basic UI components:

- Theme configuration (colors, spacing, typography)
- Basic components (Button, Card) compatible with web/mobile

## Mapping Modes

### Linear Landscape (Implemented)

Maps horizontal brightness profiles directly to pitch over time:

1. Sample brightness across the image horizontally
2. Downsample to a manageable number of notes
3. Map each brightness value to a scale degree
4. Assign sequential timing and durations
5. Apply velocity, panning, and basic effects

### Depth Ridge (Planned)

Uses contrast and edge detection to identify "peaks" and "valleys":

- Higher contrast regions become emphasized notes
- Depth estimation controls reverb and spatial effects
- Ridge detection creates melodic contours

## Future Enhancements

### Planned Features

- [ ] Advanced mapping modes (depth-based, ridge detection)
- [ ] Real-time camera input with live synthesis
- [ ] Multiple instrument layers and track mixing
- [ ] User accounts and cloud storage
- [ ] Social sharing and composition discovery
- [ ] MIDI export functionality
- [ ] Advanced synthesis engines (granular, FM, additive)
- [ ] Machine learning for intelligent mapping
- [ ] Collaborative composition sessions

### Known Limitations

- Mobile audio uses simplified playback (full synthesis planned)
- No user authentication (stub implementation only)
- In-memory persistence (database integration planned)
- Basic visualization (advanced 3D rendering planned)

## Testing

See [TESTING.md](./TESTING.md) for manual test procedures and QA guidelines.

## Contributing

This is currently a demonstration project. For production deployment:

1. Implement proper authentication (Auth0, Clerk, etc.)
2. Add database persistence (PostgreSQL + Prisma recommended)
3. Set up CI/CD pipelines
4. Add comprehensive test coverage
5. Implement error tracking (Sentry, etc.)
6. Add analytics and monitoring

## License

MIT (or your preferred license)

## Credits

Built with:

- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Next.js](https://nextjs.org/) - React framework
- [Expo](https://expo.dev/) - React Native platform
- [Fastify](https://www.fastify.io/) - Fast web framework
- [Turborepo](https://turbo.build/) - Monorepo build system
