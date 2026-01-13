# Dead Code Candidates Analysis

**Generated:** 2026-01-13
**Codebase:** OBSong/TopoSonics Monorepo

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Orphan Files | 0 | - |
| Unused Exports | 4 | Review |
| Potentially Unused Code Paths | 3 | Investigate |
| Commented-Out Code | 1 | Remove |

---

## Orphan Files (No Importers AND No Imports)

**Result: NONE DETECTED**

All source files in the codebase are connected to the dependency graph. This indicates good code hygiene.

---

## Unused or Under-Utilized Exports

### 1. packages/types/src/schemas.ts - Validation Schemas

**Evidence:**
```typescript
// packages/types/src/schemas.ts
import { z } from 'zod';

export const compositionSchema = z.object({...});
export const noteEventSchema = z.object({...});
```

**Usage Analysis:**
- Exported from `packages/types/src/index.ts`
- NOT imported anywhere in apps/web, apps/mobile, or apps/api
- Zod schemas defined but validation not enforced at runtime

**Recommendation:**
- Either integrate with API validation (Fastify schema) or remove
- If keeping, document intended usage

**Action:** REVIEW

---

### 2. packages/core-audio/src/midi.ts - MIDI Export

**Evidence:**
```typescript
// packages/core-audio/src/midi.ts
export function compositionToMidiBlob(composition: Composition, tempoBpm: number): Blob {
  // MIDI file generation
}
```

**Usage Analysis:**
- Imported only by `apps/web/src/lib/midiExport.ts`
- Mobile app does NOT use MIDI export
- Low usage (1 consumer)

**Status:** ACTIVE but under-utilized

**Recommendation:** Keep - valuable feature for web users

---

### 3. packages/core-image/src/texture.ts - Texture Analysis

**Evidence:**
```typescript
// packages/core-image/src/texture.ts:1-30
export interface TextureAnalysis {
  complexity: number;
  dominantFrequency: number;
  contrast: number;
}

export function analyzeTexture(pixels: Uint8ClampedArray, width: number, height: number): TextureAnalysis {
  // Implementation...
}
```

**Usage Analysis:**
- Exported from `packages/core-image/src/index.ts`
- Called by `analyzer.ts` but results are **not used** in output

**Evidence of Non-Use:**
```typescript
// packages/core-image/src/analyzer.ts
const texture = analyzeTexture(pixels, width, height);
// texture variable is computed but NOT included in ImageAnalysisResult
```

**Recommendation:**
- Either integrate texture data into ImageAnalysisResult
- Or remove to reduce bundle size

**Action:** INVESTIGATE

---

### 4. apps/api/src/auth.ts - optionalAuth Middleware

**Evidence:**
```typescript
// apps/api/src/auth.ts:84-98
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  // Sets userId if token present, doesn't fail otherwise
}
```

**Usage Analysis:**
- Defined and exported
- NOT used by any route in `apps/api/src/routes/*`
- All routes use `requireAuth` instead

**Recommendation:**
- Use for public endpoints that benefit from user context
- Or remove if all endpoints require auth

**Action:** REVIEW

---

## Potentially Unused Code Paths

### 1. Depth Ridge Mapping Mode

**Location:** `apps/web/src/app/studio/page.tsx`

**Evidence:**
```typescript
// Line 31-47: MappingControls shows DEPTH_RIDGE option
const MAPPING_MODES: { value: MappingMode; label: string; description: string }[] = [
  { value: 'LINEAR_LANDSCAPE', label: 'Linear Landscape', ... },
  { value: 'DEPTH_RIDGE', label: 'Depth Ridge', description: 'Uses ridge detection and depth (experimental)' },
  { value: 'MULTI_VOICE', label: 'Multi-Voice', ... },
];
```

**Issue:**
```typescript
// studio/page.tsx handleGenerate() - Line 179-214
if (mappingMode === 'MULTI_VOICE') {
  events = mapImageToMultiVoiceComposition(...);
} else {
  // DEPTH_RIDGE falls through to LINEAR_LANDSCAPE
  events = mapLinearLandscape(...);
}
```

The `DEPTH_RIDGE` mode is presented in the UI but not implemented - it falls through to `LINEAR_LANDSCAPE`.

**Recommendation:**
- Implement DEPTH_RIDGE or remove from UI
- Add `console.warn` for unimplemented modes

**Action:** IMPLEMENT or REMOVE

---

### 2. Mobile Native Depth Map

**Location:** `apps/mobile/src/services/imageProcessing.ts`

**Evidence:**
```typescript
// Lines 55-57
// TODO: Implement native depth map support
// Native depth map functionality is not yet implemented
const depthProfile = baseAnalysis.depthProfile || [];
```

**Status:** Documented TODO, no implementation

**Recommendation:** Track in issue tracker or remove TODO

---

### 3. Web Composition imageThumbnail

**Location:** `apps/web/src/app/compositions/[id]/page.tsx`

**Evidence:**
```typescript
// Lines 188-196
{composition.imageThumbnail && (
  <Card title="Source Image" padding="lg">
    <img
      src={composition.imageThumbnail}
      alt="Source"
      className="w-full rounded-lg"
    />
  </Card>
)}
```

**Issue:**
- `imageThumbnail` is checked but rarely populated
- `createComposition` in studio does not save thumbnails by default

**Recommendation:** Either populate thumbnails or remove conditional UI

---

## Commented-Out Code

### 1. Mobile EditorScreen Draft Persistence

**Location:** `apps/mobile/src/screens/EditorScreen.tsx`

No commented-out code found, but there's a disabled feature flag pattern:

```typescript
// Line 34: Draft persistence constant
const DRAFT_CACHE_KEY = '@toposonics:editor:lastDraft';
```

This is properly implemented and in use.

---

## Configuration Files Without References

All configuration files are properly referenced:

| File | Referenced By |
|------|---------------|
| `turbo.json` | turbo CLI |
| `pnpm-workspace.yaml` | pnpm |
| `tsconfig.json` (all) | TypeScript |
| `tailwind.config.ts` | PostCSS |
| `next.config.ts` | Next.js |
| `app.json` (mobile) | Expo |

---

## Test Coverage Gaps

Based on file analysis, the following appear to lack test files:

| Source File | Expected Test | Status |
|-------------|--------------|--------|
| `packages/core-audio/src/mappers.ts` | `mappers.test.ts` | MISSING |
| `packages/core-image/src/analyzer.ts` | `analyzer.test.ts` | MISSING |
| `packages/shared/src/apiClient.ts` | `apiClient.test.ts` | MISSING |

**Note:** No `__tests__` or `*.test.ts` files were found in the codebase. Consider adding a testing framework.

---

## Action Items

1. **Remove:** Nothing requires immediate removal
2. **Review:**
   - Zod schemas usage decision
   - `optionalAuth` middleware usage
3. **Investigate:**
   - Texture analysis integration
   - DEPTH_RIDGE mode implementation
4. **Add:**
   - Unit tests for core packages
   - E2E tests for critical flows
