# @toposonics/types

Shared TypeScript types and interfaces used across all TopoSonics applications and packages.

## Purpose

This package provides a single source of truth for:

- Image analysis results
- Musical note events and compositions
- API request/response types
- User and authentication types
- Configuration options for mapping modes

## Installation

```bash
pnpm add @toposonics/types
```

## Usage

```typescript
import {
  NoteEvent,
  Composition,
  ImageAnalysisResult,
  MappingMode,
  ScaleType,
  KeyType,
} from '@toposonics/types';

const note: NoteEvent = {
  note: 'C4',
  start: 0,
  duration: 0.5,
  velocity: 0.8,
  pan: 0,
};
```

## Key Types

### Musical Types

- `MappingMode` - Mapping algorithms (LINEAR_LANDSCAPE, DEPTH_RIDGE)
- `ScaleType` - Musical scales (C_MAJOR, A_MINOR, etc.)
- `KeyType` - Root notes (C, C#, D, etc.)
- `NoteEvent` - Individual musical note with timing and effects
- `SoundPreset` - Instrument/synth configuration

### Data Types

- `ImageAnalysisResult` - Output from image processing
- `Composition` - Complete musical composition
- `User` - User account information
- `AuthTokenResponse` - Authentication response

### API Types

- `ApiResponse<T>` - Standardized success response
- `ApiErrorResponse` - Standardized error response
- `HealthCheckResponse` - Server health status

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type checking
pnpm typecheck
```
