# Refactoring Priorities - Technical Debt Ranking

**Generated:** 2026-01-13
**Codebase:** OBSong/TopoSonics Monorepo

## Priority Matrix

| Priority | Impact | Effort | Items |
|----------|--------|--------|-------|
| P0 - Critical | HIGH | LOW-MED | 2 |
| P1 - High | HIGH | MED | 4 |
| P2 - Medium | MED | MED | 5 |
| P3 - Low | LOW | LOW | 3 |

---

## P0 - Critical Priority (Address This Sprint)

### 1. Add Test Infrastructure

**Current State:** Zero test files detected in codebase

**Impact:** HIGH - No safety net for refactoring, regressions go undetected

**Evidence:**
```bash
$ find . -name "*.test.ts" -o -name "*.spec.ts" | wc -l
0
```

**Recommended Actions:**
1. Add Jest/Vitest to root package.json
2. Create test files for core packages:
   - `packages/core-audio/src/__tests__/mappers.test.ts`
   - `packages/core-audio/src/__tests__/scales.test.ts`
   - `packages/core-image/src/__tests__/analyzer.test.ts`
3. Add GitHub Actions CI workflow

**Effort:** 2-3 days
**ROI:** Prevents all future regressions

---

### 2. Security: Validate API Input with Zod Schemas

**Current State:** Zod schemas defined but not enforced

**Impact:** HIGH - API accepts unvalidated payloads

**Evidence:**
```typescript
// apps/api/src/routes/compositions.ts:110-126
fastify.post<{ Body: Omit<CreateCompositionDTO, 'userId'>; ... }>(
  '/compositions',
  { preHandler: requireAuth },
  async (request, reply) => {
    const data = request.body;  // <-- No validation!

    // Manual validation (incomplete)
    if (!data.title || !data.noteEvents || ...) {
      return reply.status(400).send({...});
    }
```

**Recommended Fix:**
```typescript
import { createCompositionSchema } from '@toposonics/types';

fastify.post('/compositions', {
  preHandler: requireAuth,
  schema: {
    body: zodToJsonSchema(createCompositionSchema)
  }
}, async (request, reply) => {
  // Now validated
});
```

**Effort:** 1 day
**ROI:** Prevents injection attacks, malformed data

---

## P1 - High Priority (Address This Month)

### 3. Refactor studio/page.tsx God Component

**Current State:** 423 lines, 16 imports, 12 state variables

**Location:** `apps/web/src/app/studio/page.tsx`

**Evidence:**
```typescript
// Lines 43-66: State explosion
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
const [key, setKey] = useState<KeyType>('C');
const [scale, setScale] = useState<ScaleType>('C_MAJOR');
const [mappingMode, setMappingMode] = useState<MappingMode>('LINEAR_LANDSCAPE');
const [presetId, setPresetId] = useState('sine-soft');
const [tempo, setTempo] = useState(90);
const [selectedTopoPreset, setSelectedTopoPreset] = useState<TopoPreset | null>(null);
const [selectedScenePack, setSelectedScenePack] = useState<ScenePack | null>(null);
const [noteEvents, setNoteEvents] = useState<NoteEvent[]>([]);
// ... more state
```

**Recommended Refactoring:**

1. Extract `useStudioState` hook:
```typescript
// hooks/useStudioState.ts
export function useStudioState() {
  const [state, dispatch] = useReducer(studioReducer, initialState);
  return { state, actions: bindActions(dispatch) };
}
```

2. Extract `useImageAnalysis` hook:
```typescript
// hooks/useImageAnalysis.ts
export function useImageAnalysis(mappingMode: MappingMode) {
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImage = async (file: File) => {...};

  return { analysis, isAnalyzing, analyzeImage };
}
```

3. Split into section components:
   - `StudioImageSection.tsx`
   - `StudioControlsSection.tsx`
   - `StudioPlaybackSection.tsx`
   - `StudioSaveSection.tsx`

**Effort:** 3-4 days
**ROI:** Easier maintenance, testability, performance (memoization)

---

### 4. Implement Error Boundaries

**Current State:** No error boundaries in React apps

**Impact:** Unhandled errors crash entire app

**Evidence:**
```typescript
// apps/web/src/app/layout.tsx - No error boundary wrapping
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}  {/* <-- Errors propagate to root */}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Recommended Fix:**
```typescript
// components/ErrorBoundary.tsx
'use client';
export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Caught error:', error, info);
    // Send to Sentry/LogRocket
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**Effort:** 1 day
**ROI:** Better UX, error tracking capability

---

### 5. Add TypeScript Strict Mode

**Current State:** Mixed strict settings across packages

**Evidence:**
```json
// Various tsconfig.json files have:
"strict": true  // Some packages
"strict": false // Others (implied)
```

**Recommended Actions:**
1. Enable `strict: true` in root tsconfig
2. Enable `noUncheckedIndexedAccess`
3. Fix all resulting type errors

**Effort:** 2-3 days
**ROI:** Catches null/undefined bugs at compile time

---

### 6. Centralize Environment Configuration

**Current State:** Environment variables scattered across apps

**Evidence:**
```typescript
// apps/web - process.env.NEXT_PUBLIC_*
// apps/mobile - EXPO_PUBLIC_* via config.ts
// apps/api - process.env.* in config.ts
```

**Recommended Structure:**
```
packages/config/
  src/
    web.ts      # Next.js env
    mobile.ts   # Expo env
    api.ts      # API env
    shared.ts   # Common validation
```

**Effort:** 1-2 days
**ROI:** Single source of truth, easier deployment

---

## P2 - Medium Priority (Address This Quarter)

### 7. Remove Unused DEPTH_RIDGE Mode or Implement It

**Current State:** UI option exists, not implemented

**Location:** `apps/web/src/components/MappingControls.tsx:39-41`

**Evidence:**
```typescript
{
  value: 'DEPTH_RIDGE',
  label: 'Depth Ridge',
  description: 'Uses ridge detection and depth (experimental)',
}
```

But in `studio/page.tsx`:
```typescript
if (mappingMode === 'MULTI_VOICE') {
  events = mapImageToMultiVoiceComposition(...);
} else {
  // DEPTH_RIDGE falls through to LINEAR_LANDSCAPE!
  events = mapLinearLandscape(...);
}
```

**Recommended:** Either implement or remove from UI with "(Coming Soon)" label

**Effort:** 3-5 days (implement) or 30 min (remove)

---

### 8. Integrate Texture Analysis Results

**Current State:** Texture computed but not used

**Location:** `packages/core-image/src/analyzer.ts`

**Evidence:**
```typescript
const texture = analyzeTexture(pixels, width, height);
// texture is computed but NOT included in return value
```

**Recommended:** Add to `ImageAnalysisResult` interface and use in mapping

---

### 9. Add API Rate Limiting Per-User

**Current State:** Global rate limiting only

**Evidence:**
```typescript
// apps/api/src/server.ts
await fastify.register(rateLimit, {
  global: true,
  max: config.rateLimit.max,  // 120 per minute GLOBAL
});
```

**Recommended:** Add per-user limits for authenticated endpoints

---

### 10. Mobile Offline Sync Improvements

**Current State:** Basic cache with stale data risk

**Location:** `apps/mobile/src/state/CompositionsProvider.tsx`

**Evidence:**
```typescript
// No timestamp checking for cache staleness
const hydrateFromCache = useCallback(async () => {
  const cached = await AsyncStorage.getItem(CACHE_KEYS.list);
  if (cached) {
    const parsed = JSON.parse(cached);
    setCompositions(parsed.items);  // <-- No freshness check
  }
});
```

**Recommended:** Add cache TTL and optimistic updates

---

### 11. Bundle Size Optimization

**Current State:** Full Tone.js imported

**Evidence:**
```typescript
// apps/web/src/hooks/useToneEngine.ts
import * as Tone from 'tone';  // ~300KB
```

**Recommended:** Tree-shake Tone.js or use dynamic imports

---

## P3 - Low Priority (Backlog)

### 12. Add JSDoc to Public APIs

**Current State:** Minimal documentation

**Recommended:** Add JSDoc to all exported functions in packages/*

---

### 13. Standardize Error Handling

**Current State:** Mixed patterns (throw, console.error, Alert)

**Recommended:** Create shared error utilities

---

### 14. Add Logging Infrastructure

**Current State:** `console.log` scattered throughout

**Recommended:** Add structured logging (pino/winston)

---

## Technical Debt Summary

| Category | Count | Est. Effort |
|----------|-------|-------------|
| Missing Tests | 3 core packages | 3 days |
| Security | 1 validation gap | 1 day |
| Architecture | 2 god components | 4 days |
| Type Safety | 1 strict mode | 2 days |
| Dead Code | 2 unused features | 1 day |
| **TOTAL** | | **~11 days** |

---

## Recommended Sprint Plan

**Sprint 1 (Week 1-2):**
- [P0] Add test infrastructure
- [P0] Implement API validation
- [P1] Add error boundaries

**Sprint 2 (Week 3-4):**
- [P1] Refactor studio/page.tsx
- [P1] Enable TypeScript strict mode

**Sprint 3 (Week 5-6):**
- [P2] Implement or remove DEPTH_RIDGE
- [P2] Integrate texture analysis
- [P1] Centralize env config
