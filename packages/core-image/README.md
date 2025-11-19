# @toposonics/core-image

Environment-agnostic image analysis utilities for extracting musical features from images.

## Purpose

This package provides pure TypeScript functions for:

- Computing brightness profiles from pixel data
- Estimating depth from local contrast
- Detecting ridges and edges
- Downsampling and smoothing profiles

## Key Features

- **Environment-agnostic**: Works in browser, Node.js, React Native
- **Pure functions**: No side effects, easy to test
- **Flexible**: Multiple analysis modes and options
- **Performant**: Optimized algorithms with configurable sampling

## Installation

```bash
pnpm add @toposonics/core-image
```

## Usage

### Browser (Canvas API)

```typescript
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;
canvas.width = image.width;
canvas.height = image.height;
ctx.drawImage(image, 0, 0);

const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const result = analyzeImageForLinearLandscape(
  imageData.data,
  canvas.width,
  canvas.height,
  {
    maxSamples: 64,
    includeDepth: true,
    averageRows: true,
  }
);

console.log(result.brightnessProfile); // [123, 145, 167, ...]
```

### React Native (expo-image-manipulator)

```typescript
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';

const manipulated = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 800 } }],
  { format: ImageManipulator.SaveFormat.PNG }
);

// Extract pixel data (you'll need a library like react-native-image-to-pixels)
const { pixels, width, height } = await getPixelData(manipulated.uri);

const result = analyzeImageForLinearLandscape(pixels, width, height);
```

## API Reference

### Main Analysis Functions

#### `analyzeImageForLinearLandscape(pixels, width, height, options?)`

Analyzes an image for the LINEAR_LANDSCAPE mapping mode.

**Parameters:**
- `pixels`: Uint8ClampedArray | number[] - RGBA pixel data
- `width`: number - Image width
- `height`: number - Image height
- `options`: Optional configuration
  - `rowIndex`: Row to sample (default: middle)
  - `averageRows`: Average multiple rows (default: false)
  - `rowsToAverage`: Number of rows to average (default: 5)
  - `maxSamples`: Maximum output samples (default: 128)
  - `includeDepth`: Compute depth profile (default: true)
  - `includeRidges`: Detect ridges (default: false)

**Returns:** `ImageAnalysisResult`

#### `analyzeImageForDepthRidge(pixels, width, height, options?)`

Analyzes an image with ridge detection (advanced mode, partially implemented).

#### `analyzeImageQuick(pixels, width, height)`

Fast analysis with minimal sampling for previews.

### Utility Functions

- `computePixelBrightness(r, g, b)` - Calculate perceived brightness
- `computeBrightnessProfileFromRow(pixels, width, height, rowIndex)` - Extract single row
- `downsampleProfile(profile, targetSamples)` - Reduce sample count
- `computeSimpleDepthProfile(brightnessProfile)` - Estimate depth from contrast
- `detectRidges(brightnessProfile)` - Find edges and peaks
- `smoothProfile(profile, windowSize)` - Apply moving average

## Example Output

```typescript
{
  width: 800,
  height: 600,
  brightnessProfile: [45, 67, 89, 123, ...], // 0-255
  depthProfile: [0.3, 0.5, 0.8, 0.6, ...],   // 0-1
  ridgeStrength: [0.1, 0.9, 0.2, 0.7, ...],  // 0-1
  metadata: {
    samplingMethod: 'averaged',
    rowIndex: 300,
    timestamp: 1703001234567
  }
}
```

## Performance

- Typical image (800x600): ~5-10ms analysis time
- Large image (3000x2000): ~20-30ms with downsampling
- Quick mode: <5ms for any image size

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```
