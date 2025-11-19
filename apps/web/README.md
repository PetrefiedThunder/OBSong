# @toposonics/web

Next.js 14 web application for TopoSonics - turn images into musical soundscapes.

## Features

- **Image Upload**: Drag & drop or file selection
- **Real-time Analysis**: Extracts brightness and depth profiles from images
- **Musical Mapping**: Convert visual features to notes, scales, and effects
- **Tone.js Playback**: Browser-based synthesis with reverb, panning, and filters
- **Timeline Visualization**: See your composition as pitch vs. time
- **Composition Library**: Save and replay your creations
- **Responsive Design**: Works on desktop and mobile browsers

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm dev:web

# Build for production
pnpm build:web

# Start production server
cd apps/web && pnpm start
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Pages

- **/** - Landing page with feature overview
- **/studio** - Main workspace for creating compositions
- **/compositions** - List of all saved compositions
- **/compositions/[id]** - View and replay a specific composition

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Audio**: Tone.js
- **Image Processing**: Canvas API + @toposonics/core-image
- **State**: React hooks + Context API
- **Type Safety**: TypeScript (strict mode)

## Key Components

### `ImageUploader`

Handles file selection, drag-and-drop, and preview display.

### `MappingControls`

UI for selecting key, scale, mapping mode, and sound preset.

### `PlaybackControls`

Play/stop buttons and tempo slider.

### `TimelineVisualizer`

Canvas-based visualization of note events over time.

## Hooks

### `useAuth`

Manages authentication state (stub implementation).

### `useToneEngine`

Initializes Tone.js, creates synth and effects, handles playback.

## How It Works

1. User uploads an image
2. `analyzeImageFile()` extracts pixel data via Canvas API
3. `analyzeImageForLinearLandscape()` computes brightness profile
4. `mapLinearLandscape()` converts brightness to note events
5. `useToneEngine` renders notes with Tone.js
6. User can save to backend via API

## Performance

- Large images are resized to max 1200px before processing
- Brightness profiles are downsampled to 64 samples
- Canvas rendering is optimized with requestAnimationFrame
- Tone.js uses Web Audio API for efficient synthesis

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires user interaction to start audio)
- Mobile: Works but desktop recommended for best experience

## Future Enhancements

- Camera capture for live input
- Real-time mode with streaming audio
- Multiple track/layer support
- MIDI export
- Social sharing
- Collaborative sessions
- 3D visualization

## Troubleshooting

### No audio playback

- Ensure you clicked a button to start audio (browser autoplay policy)
- Check browser console for Tone.js errors
- Try refreshing the page

### Image won't upload

- Check file is a valid image format (JPG, PNG, etc.)
- Try a smaller file size
- Check browser console for errors

### API errors

- Ensure backend is running at `http://localhost:3001`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify network tab in devtools for request failures

## License

MIT
