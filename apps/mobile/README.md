# @toposonics/mobile

Expo React Native mobile app for TopoSonics - simplified demonstration of shared package integration.

## Overview

This is a **simplified mobile implementation** that demonstrates:
- Integration with shared `@toposonics` packages (types, core-image, core-audio)
- Basic navigation structure
- Image picker integration
- API connectivity for fetching compositions
- Foundation for full audio implementation

## Status

**This is a demonstration/foundation app** showing how the monorepo architecture extends to mobile. Full features (pixel extraction, audio synthesis) are marked as TODOs for future implementation.

## Quick Start

```bash
# From monorepo root
cd apps/mobile

# Install Expo CLI globally (if needed)
npm install -g expo-cli

# Start development server
pnpm dev

# Or use specific platforms
pnpm ios      # iOS simulator
pnpm android  # Android emulator
pnpm web      # Web browser
```

## Requirements

- Node.js >= 18
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for physical device testing)

## Screens

### HomeScreen

Landing page with navigation to editor and compositions list.

### EditorScreen

- Image picker (gallery or camera)
- Musical parameter selection (simplified)
- Generate composition button (placeholder)
- Shows how to integrate core packages

### CompositionsScreen

- Fetches compositions from API
- Displays list of saved soundscapes
- Navigate to detail view

### CompositionDetailScreen

- Shows composition metadata
- Playback button (placeholder)
- Demonstrates API integration

## Architecture

```
mobile/
├── App.tsx                   # Navigation setup
├── src/
│   └── screens/             # Screen components
│       ├── HomeScreen.tsx
│       ├── EditorScreen.tsx
│       ├── CompositionsScreen.tsx
│       └── CompositionDetailScreen.tsx
├── app.json                 # Expo configuration
└── package.json
```

## Shared Package Integration

The app imports from monorepo packages:

```typescript
import type { KeyType, ScaleType, Composition } from '@toposonics/types';
import { mapLinearLandscape, getScaleNotes } from '@toposonics/core-audio';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
```

## Future Implementation TODOs

### Image Processing

The app now delegates resizing and RGBA extraction to the native OpenCV-powered module:

```typescript
import { processImage } from '@toposonics/native-image-processing';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';

const { pixels, width, height } = await processImage({ uri: imageUri, targetWidth: 800 });
const analysis = analyzeImageForLinearLandscape(pixels, width, height);
```

### Audio Playback

```typescript
// TODO: Use expo-av for playback
import { Audio } from 'expo-av';

// Simple implementation: play a tone for each note
for (const note of noteEvents) {
  const frequency = noteToFrequency(note.note);
  // Play tone at frequency for duration
  // This is simplified - for full synthesis, consider:
  // - Tone.js mobile port
  // - Native audio module
  // - Pre-rendered audio files
}
```

### Full Feature Checklist

- [ ] Complete image pixel extraction pipeline
- [ ] Implement brightness profile analysis
- [ ] Generate note events from images
- [ ] Audio synthesis/playback (expo-av or native module)
- [ ] Save compositions to backend
- [ ] User authentication
- [ ] Offline support
- [ ] Advanced audio effects

## Environment Configuration

Create `.env` in `apps/mobile` for production and local builds:

```bash
EXPO_PUBLIC_API_URL=https://api.toposonics.com
IOS_BUILD_NUMBER=1.0.0
```

`EXPO_PUBLIC_API_URL` is injected via Expo config (`extra.apiUrl`) and consumed in the screens. Override values locally by copying `.env` to a `.env.local` file (ignored by Git).

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Testing

```bash
# Type checking
pnpm typecheck

# Lint
pnpm lint
```

## Known Limitations

1. **Native pipeline is Android-first**: OpenCV-backed extraction is implemented for Android; texture-based capture and iOS
   parity still need work.
2. **No audio playback**: Simplified alerts instead of actual synthesis
3. **No auth**: API calls work without authentication
4. **Placeholder controls**: Musical parameters are hard-coded

## Why This Approach?

This simplified app demonstrates:
- ✅ Monorepo structure works across web and mobile
- ✅ Shared TypeScript packages compile for React Native
- ✅ Navigation and basic UI patterns
- ✅ API integration foundation
- ✅ Image picker integration
- ⏳ Audio and advanced features marked as TODOs

For a **production mobile app**, the next steps would be:
1. Harden native image extraction across platforms (texture input, iOS parity)
2. Add audio synthesis (expo-av or native audio module)
3. Complete user authentication
4. Add proper state management (Zustand, Redux)
5. Implement offline support and caching

## Compatibility

- **iOS**: Tested on iOS 16+
- **Android**: Tested on Android 12+
- **Expo SDK**: ~50.0.0

## License

MIT
