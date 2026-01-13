# High-Risk Modules Analysis

**Generated:** 2026-01-13
**Codebase:** OBSong/TopoSonics Monorepo

## Risk Scoring Methodology

| Factor | Weight | Description |
|--------|--------|-------------|
| Coupling Score | 40% | Number of imports + importers |
| Lines of Code | 20% | File size complexity |
| Export Count | 15% | Public API surface |
| External Deps | 15% | Third-party dependency count |
| Change Frequency | 10% | Git history (if available) |

---

## Critical Risk Modules (Score 80+)

### 1. packages/types/src/index.ts
**Coupling Score:** 95 | **Risk Level:** CRITICAL

**Why It's Critical:**
- Foundation of entire codebase
- Every app and package imports from here
- Changes propagate to ALL 65+ files

**Evidence:**
```typescript
// Re-exports everything - change here affects entire monorepo
export * from './image';
export * from './audio';
export * from './mapping';
export * from './composition';
export * from './user';
export * from './api';
export * from './schemas';
```

**Blast Radius:**
- Direct dependents: 9 packages/apps
- Transitive dependents: ALL source files
- Affected tests: ALL test files

**Mitigation:**
- NEVER remove exports without major version bump
- Add new types in feature branches
- Consider splitting into multiple entry points (e.g., `@toposonics/types/audio`)

---

### 2. apps/web/src/app/studio/page.tsx
**Coupling Score:** 90 | **Risk Level:** CRITICAL

**Why It's Critical:**
- Main feature page with 16 imports
- Integrates image processing, audio, and state
- 423 lines of complex React component

**Evidence:**
```typescript
// Lines 1-33: Heavy import section
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card } from '@toposonics/ui';
import type { KeyType, ScaleType, MappingMode, NoteEvent, ImageAnalysisResult } from '@toposonics/types';
import { mapLinearLandscape, mapImageToMultiVoiceComposition, getPresetById, /* 6 more */ } from '@toposonics/core-audio';
import { analyzeImageFile, analyzeImageFileMultiVoice } from '@/lib/imageProcessing';
import { createComposition } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToneEngine } from '@/hooks/useToneEngine';
import { ImageUploader } from '@/components/ImageUploader';
import { MappingControls } from '@/components/MappingControls';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';
import { ScenePackSelector } from '@/components/ScenePackSelector';
import { exportCompositionToMidi } from '@/lib/midiExport';
```

**Anti-Patterns Detected:**
- **God Component:** 423 lines, handles upload, analysis, playback, saving
- **Prop drilling potential:** Multiple state handlers passed to children

**Refactoring Priority:** HIGH
1. Extract `useImageAnalysis` hook
2. Extract `useCompositionGenerator` hook
3. Split into `StudioUploadSection`, `StudioControlsSection`, `StudioPlaybackSection`

---

### 3. packages/core-audio/src/index.ts
**Coupling Score:** 85 | **Risk Level:** HIGH

**Why It's High Risk:**
- Central audio processing barrel file
- Used by both web and mobile apps
- 6 internal module exports

**Blast Radius:**
- Direct: web app (5 files), mobile app (3 files)
- Transitive: All studio/editor features

**Recommendation:** Stable, but document all exports in JSDoc. Consider namespace exports for tree-shaking optimization.

---

### 4. apps/mobile/App.tsx
**Coupling Score:** 85 | **Risk Level:** HIGH

**Why It's High Risk:**
- Mobile app entry point
- Wraps entire app in providers
- Navigation configuration central point

**Evidence:**
```typescript
// Lines 1-11: Critical imports
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import CompositionsScreen from './src/screens/CompositionsScreen';
import CompositionDetailScreen from './src/screens/CompositionDetailScreen';
import { AuthProvider } from './src/auth/AuthProvider';
import { CompositionsProvider } from './src/state/CompositionsProvider';
```

**Recommendation:** Current structure is appropriate for an RN entry point. Add error boundaries.

---

## High Risk Modules (Score 70-79)

### 5. packages/core-image/src/analyzer.ts
**Coupling Score:** 80 | **Risk Level:** HIGH

**Why:**
- Core image analysis logic
- Imports all other core-image modules
- Complex algorithm with multiple code paths

**Evidence:**
```typescript
// Line 1-6: Internal coupling
import type { ImageAnalysisResult, BrightnessSample } from '@toposonics/types';
import { extractBrightnessProfile } from './brightness';
import { computeDepthProfile } from './depth';
import { detectHorizon } from './horizon';
import { analyzeTexture } from './texture';
```

**Lines:** ~200
**Exports:** 2 (`analyzeImageForLinearLandscape`, `analyzeImageForMultiVoice`)

---

### 6. apps/web/src/contexts/AuthContext.tsx
**Coupling Score:** 70 | **Risk Level:** HIGH

**Why:**
- Authentication state provider
- Used by every authenticated page
- Supabase integration point

**Evidence:**
```typescript
// Critical state management
const [user, setUser] = useState<User | null>(null);
const [token, setToken] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

**Blast Radius:**
- Direct: 5 pages/components
- Transitive: All authenticated features

---

### 7. apps/mobile/src/auth/AuthProvider.tsx
**Coupling Score:** 75 | **Risk Level:** HIGH

**Why:**
- Mobile authentication state
- Apple Sign-In integration
- Supabase token management

**Evidence:**
```typescript
// Lines 58-79: Apple authentication complexity
const signInWithApple = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  });
  // ... identity token handling
};
```

---

### 8. apps/mobile/src/state/CompositionsProvider.tsx
**Coupling Score:** 70 | **Risk Level:** HIGH

**Why:**
- Composition state with offline caching
- AsyncStorage integration
- API synchronization logic

**Lines:** 157
**Complexity:** Cache hydration + API fallback logic

---

## Medium Risk Modules (Score 50-69)

| Module | Score | Risk | Primary Concern |
|--------|-------|------|-----------------|
| `apps/api/src/server.ts` | 80 | HIGH | Entry point, middleware config |
| `packages/core-audio/src/mappers.ts` | 70 | HIGH | Core algorithm, math-heavy |
| `apps/web/src/hooks/useToneEngine.ts` | 65 | MEDIUM | Complex audio lifecycle |
| `apps/mobile/src/services/imageProcessing.ts` | 60 | MEDIUM | Native bridge dependency |
| `apps/api/src/auth.ts` | 65 | MEDIUM | Security-critical middleware |
| `apps/api/src/services/compositions.ts` | 60 | MEDIUM | Database access layer |
| `apps/web/src/lib/api.ts` | 55 | MEDIUM | API client wrapper |
| `apps/mobile/src/services/apiClient.ts` | 50 | MEDIUM | Token injection logic |

---

## Recommendations Summary

1. **Immediate:** Add comprehensive tests for packages/types (foundation)
2. **Short-term:** Refactor `studio/page.tsx` into smaller components
3. **Medium-term:** Add error boundaries to mobile App.tsx
4. **Long-term:** Consider TypeScript strict mode for all packages

---

## Change Impact Matrix

When modifying these high-risk modules, use this checklist:

| Module Changed | Must Test |
|----------------|-----------|
| `packages/types/*` | ALL apps, ALL packages |
| `packages/core-audio/*` | web studio, mobile editor |
| `packages/core-image/*` | web imageProcessing, mobile imageProcessing |
| `apps/web/src/contexts/AuthContext` | All authenticated web pages |
| `apps/mobile/src/auth/AuthProvider` | All authenticated mobile screens |
| `apps/api/src/auth.ts` | All protected API routes |
