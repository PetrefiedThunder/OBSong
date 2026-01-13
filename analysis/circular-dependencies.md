# Circular Dependencies Analysis

**Generated:** 2026-01-13
**Codebase:** OBSong/TopoSonics Monorepo

## Summary

| Status | Count |
|--------|-------|
| Direct Circular Dependencies | 0 |
| Potential Circular Risks | 2 |
| Barrel File Re-export Chains | 6 |

## Findings

### No Direct Circular Dependencies Detected

The codebase is well-structured with a clear unidirectional dependency flow:

```
packages/types (foundation)
    |
    +---> packages/core-audio
    +---> packages/core-image
    +---> packages/shared
    |
    +---> apps/web
    +---> apps/mobile
    +---> apps/api
```

---

## Potential Circular Risks

### Risk 1: Mobile Auth <-> API Client Coupling

**Location:** `apps/mobile/src/`

**Files Involved:**
- `auth/supabaseClient.ts`
- `services/apiClient.ts`

**Evidence:**
```typescript
// apps/mobile/src/services/apiClient.ts:10
import { supabase } from '../auth/supabaseClient';

// apps/mobile/src/auth/supabaseClient.ts imports secureStorage
// secureStorage is independent, but both supabase and apiClient
// are used across the app
```

**Risk Level:** LOW

**Recommendation:** Current structure is acceptable. Both modules are consumed by higher-level providers. Monitor if apiClient ever needs to import from AuthProvider.

---

### Risk 2: Composition Types Cross-Referencing

**Location:** `packages/types/src/`

**Files Involved:**
- `composition.ts`
- `audio.ts`

**Evidence:**
```typescript
// packages/types/src/composition.ts:1-5
import type { KeyType, ScaleType, MappingMode, NoteEvent } from './audio';

export interface Composition {
  // ... uses audio types
}
```

**Risk Level:** VERY LOW

**Recommendation:** This is intentional type composition. The `audio.ts` module does NOT import from `composition.ts`, so no cycle exists. This is the correct pattern for type hierarchies.

---

## Barrel File Analysis

Barrel files (`index.ts`) that re-export multiple modules can mask circular dependencies. Current barrel files are clean:

### packages/types/src/index.ts
```typescript
export * from './image';
export * from './audio';
export * from './mapping';
export * from './composition';
export * from './user';
export * from './api';
export * from './schemas';
```
**Status:** CLEAN - All exports are leaf modules

### packages/core-audio/src/index.ts
```typescript
export * from './scales';
export * from './mappers';
export * from './midi';
export * from './presets';
export * from './scenePacks';
export * from './topoPresets';
```
**Status:** CLEAN - Internal modules have unidirectional deps

### packages/core-image/src/index.ts
```typescript
export * from './analyzer';
export * from './brightness';
export * from './depth';
export * from './horizon';
export * from './texture';
```
**Status:** CLEAN - `analyzer.ts` imports from others, not vice versa

### packages/shared/src/index.ts
```typescript
export * from './apiClient';
```
**Status:** CLEAN - Single module

### packages/ui/src/index.ts
```typescript
export * from './theme';
export * from './components';
```
**Status:** CLEAN - Components are leaf nodes

### packages/ui/src/components/index.ts
```typescript
export * from './Button';
export * from './Card';
```
**Status:** CLEAN - No cross-imports between Button and Card

---

## Prevention Recommendations

1. **Maintain Package Boundaries:** The current workspace structure enforces good boundaries. Never add `apps/*` as dependencies to `packages/*`.

2. **Avoid Deep Import Chains:** Current max depth is 3 (app -> package -> internal module). Keep it under 4.

3. **Type-Only Imports:** Continue using `import type` where appropriate to avoid runtime circular dependencies.

4. **ESLint Rule:** Consider adding `eslint-plugin-import` with `import/no-cycle` rule:
   ```json
   {
     "rules": {
       "import/no-cycle": ["error", { "maxDepth": 3 }]
     }
   }
   ```

---

## Conclusion

The OBSong/TopoSonics codebase has **zero circular dependencies**. The monorepo architecture with clear package boundaries and unidirectional data flow is well-designed. Continue following the current patterns.
