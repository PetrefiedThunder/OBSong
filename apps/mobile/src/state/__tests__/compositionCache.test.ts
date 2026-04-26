import { describe, expect, it } from 'vitest';
import {
  canUseCompositionCache,
  getCompositionDetailCacheKey,
  getCompositionListCacheKey,
} from '../compositionCache';

describe('composition cache helpers', () => {
  it('scopes list cache keys by user id', () => {
    expect(getCompositionListCacheKey('user-a')).toBe('@toposonics:compositions:list:user-a');
    expect(getCompositionListCacheKey('user-a')).not.toBe(
      getCompositionListCacheKey('user-b')
    );
  });

  it('scopes detail cache keys by user id and composition id', () => {
    expect(getCompositionDetailCacheKey('user-a', 'comp-1')).toBe(
      '@toposonics:compositions:user-a:comp-1'
    );
    expect(getCompositionDetailCacheKey('user-a', 'comp-1')).not.toBe(
      getCompositionDetailCacheKey('user-b', 'comp-1')
    );
  });

  it('refuses private cache access without an authenticated user session', () => {
    expect(canUseCompositionCache(null, null)).toBe(false);
    expect(canUseCompositionCache('token', null)).toBe(false);
    expect(canUseCompositionCache(null, 'user-a')).toBe(false);
    expect(canUseCompositionCache('token', 'user-a')).toBe(true);
  });
});
