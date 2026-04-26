export const COMPOSITION_LIST_CACHE_PREFIX = '@toposonics:compositions:list';

export function getCompositionListCacheKey(userId: string): string {
  return `${COMPOSITION_LIST_CACHE_PREFIX}:${userId}`;
}

export function getCompositionDetailCacheKey(userId: string, compositionId: string): string {
  return `@toposonics:compositions:${userId}:${compositionId}`;
}

export function canUseCompositionCache(
  token: string | null,
  userId: string | null
): boolean {
  return Boolean(token && userId);
}
