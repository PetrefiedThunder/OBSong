import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Composition, CompositionSummary, CreateCompositionDTO } from '@toposonics/types';
import {
  fetchComposition,
  fetchAllCompositions,
  createComposition,
  deleteComposition as apiDeleteComposition,
} from '../services/apiClient';
import { useAuth } from '../auth/AuthProvider';
import {
  canUseCompositionCache,
  getCompositionDetailCacheKey,
  getCompositionListCacheKey,
} from './compositionCache';

interface CompositionsContextValue {
  /** Lightweight list summaries; full compositions live in compositionsById. */
  compositions: CompositionSummary[];
  /** Full compositions (with noteEvents), populated on demand by loadComposition. */
  compositionsById: Record<string, Composition>;
  loading: boolean;
  usingCache: boolean;
  refresh: () => Promise<void>;
  loadComposition: (id: string) => Promise<Composition | null>;
  saveComposition: (payload: Omit<CreateCompositionDTO, 'userId'>) => Promise<Composition | null>;
  removeComposition: (id: string) => Promise<void>;
}

const CompositionsContext = createContext<CompositionsContextValue | undefined>(undefined);

export function CompositionsProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [compositions, setCompositions] = useState<CompositionSummary[]>([]);
  const [compositionsById, setCompositionsById] = useState<Record<string, Composition>>({});
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);

  const activeUserId = user?.id ?? null;
  // Object identity distinguishes separate sessions even when A switches to B and back to A.
  const session = useMemo(() => ({ userId: activeUserId, token }), [activeUserId, token]);
  const activeSessionRef = React.useRef<typeof session | null>(session);
  const isCurrentSession = useCallback(() => activeSessionRef.current === session, [session]);

  // Update this ref with each list write so concurrent mutations use the same list as state.
  const compositionsRef = React.useRef(compositions);
  useLayoutEffect(() => {
    activeSessionRef.current = session;
    compositionsRef.current = [];
    setCompositions([]);
    setCompositionsById({});
    setUsingCache(false);
    return () => { activeSessionRef.current = null; };
  }, [session]);

  const saveToCache = useCallback(async (items: CompositionSummary[]) => {
    if (!activeUserId || !isCurrentSession()) return;

    try {
      await AsyncStorage.setItem(
        getCompositionListCacheKey(activeUserId),
        JSON.stringify({ items, cachedAt: Date.now() })
      );
    } catch (err) {
      console.warn('Failed to cache compositions', err);
    }
  }, [activeUserId, isCurrentSession]);

  const saveDetailToCache = useCallback(async (item: Composition) => {
    if (!activeUserId || !isCurrentSession()) return;

    try {
      await AsyncStorage.setItem(getCompositionDetailCacheKey(activeUserId, item.id), JSON.stringify(item));
    } catch (err) {
      console.warn('Failed to cache composition detail', err);
    }
  }, [activeUserId, isCurrentSession]);

  const hydrateFromCache = useCallback(async () => {
    if (!activeUserId || !isCurrentSession()) return;

    try {
      const cached = await AsyncStorage.getItem(getCompositionListCacheKey(activeUserId));
      if (!isCurrentSession()) return;
      if (cached) {
        // Caches written before the summary migration hold full compositions; they still
        // satisfy every summary field the list UI reads, so no migration is needed. They
        // are no longer merged into compositionsById — that map holds full compositions
        // only, populated by loadComposition (which has its own detail cache).
        const parsed = JSON.parse(cached) as { items: CompositionSummary[] };
        compositionsRef.current = parsed.items;
        setCompositions(parsed.items);
        setUsingCache(true);
      }
    } catch (err) {
      console.warn('Failed to hydrate compositions cache', err);
    }
  }, [activeUserId, isCurrentSession]);

  const refresh = useCallback(async () => {
    if (!isCurrentSession()) return;
    if (!canUseCompositionCache(token, activeUserId)) {
      compositionsRef.current = [];
      setCompositions([]);
      setCompositionsById({});
      setUsingCache(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setUsingCache(false);
    try {
      // Page through the whole library so saves beyond the server's page size
      // (default 50) don't silently disappear from the list.
      const data = await fetchAllCompositions();
      // Discard results if the active user changed while the request was in flight,
      // so we never repopulate a signed-out screen (or another account) with A's data.
      if (!isCurrentSession()) return;
      // The list endpoint now returns summaries (no noteEvents/imageData), so they are
      // not merged into compositionsById — full records come from loadComposition.
      compositionsRef.current = data;
      setCompositions(data);
      await saveToCache(data);
    } catch (err) {
      if (!isCurrentSession()) return;
      console.warn('Falling back to cached compositions', err);
      await hydrateFromCache();
    } finally {
      if (isCurrentSession()) {
        setLoading(false);
      }
    }
  }, [activeUserId, token, hydrateFromCache, saveToCache, isCurrentSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadComposition = useCallback(
    async (id: string) => {
      if (!isCurrentSession() || !canUseCompositionCache(token, activeUserId)) {
        return null;
      }

      const cacheUserId = activeUserId as string;
      try {
        const data = await fetchComposition(id);
        if (!isCurrentSession()) return null;
        setCompositionsById((prev) => ({ ...prev, [id]: data }));
        await saveDetailToCache(data);
        return isCurrentSession() ? data : null;
      } catch (err) {
        if (!isCurrentSession()) return null;
        console.warn('Failed to fetch composition, using cache', err);
        const cached = await AsyncStorage.getItem(
          getCompositionDetailCacheKey(cacheUserId, id)
        );
        if (!isCurrentSession()) return null;
        if (cached) {
          return JSON.parse(cached) as Composition;
        }
        return null;
      }
    },
    [activeUserId, token, saveDetailToCache, isCurrentSession]
  );

  const saveComposition = useCallback(
    async (payload: Omit<CreateCompositionDTO, 'userId'>) => {
      if (!isCurrentSession() || !canUseCompositionCache(token, activeUserId)) return null;

      let created: Composition;
      try {
        created = await createComposition(payload);
      } catch (err) {
        if (!isCurrentSession()) return null;
        throw err;
      }
      // Discard if the active user changed while the save was in flight (consistent with
      // refresh/loadComposition), so we don't write into the wrong user's state/cache.
      if (!isCurrentSession()) return null;

      // The list holds lightweight summaries: derive one from the created composition so
      // the noteEvents/imageData blobs stay out of the list state and its cache.
      const createdSummary: CompositionSummary = {
        id: created.id,
        userId: created.userId,
        title: created.title,
        description: created.description,
        mappingMode: created.mappingMode,
        key: created.key,
        scale: created.scale,
        presetId: created.presetId,
        tempo: created.tempo,
        imageThumbnail: created.imageThumbnail,
        noteCount: created.noteEvents.length,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
      // Derive the next list from the committed ref (not inside a functional updater) so the
      // exact list we persist is the one we set. Assign the ref immediately so a second
      // mutation completing before React's sync effect runs builds on this list, not a stale one.
      const nextList = [createdSummary, ...compositionsRef.current];
      compositionsRef.current = nextList;
      setCompositions(nextList);
      void saveToCache(nextList);
      setCompositionsById((prev) => ({ ...prev, [created.id]: created }));
      await saveDetailToCache(created);
      return isCurrentSession() ? created : null;
    },
    [activeUserId, token, saveDetailToCache, saveToCache, isCurrentSession]
  );

  const removeComposition = useCallback(
    async (id: string) => {
      if (!isCurrentSession() || !canUseCompositionCache(token, activeUserId)) return;
      try {
        await apiDeleteComposition(id);
      } catch (err) {
        if (!isCurrentSession()) return;
        throw err;
      }
      if (!isCurrentSession()) return;

      // Prune from in-memory state and the persisted caches so the deleted item
      // doesn't reappear from cache on the next mount. Derive the next list from the
      // committed ref so saveToCache persists exactly what we set; assign the ref
      // immediately so back-to-back mutations never build on a stale list.
      const nextList = compositionsRef.current.filter((c) => c.id !== id);
      compositionsRef.current = nextList;
      setCompositions(nextList);
      setCompositionsById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      void saveToCache(nextList);
      if (activeUserId) {
        try {
          await AsyncStorage.removeItem(getCompositionDetailCacheKey(activeUserId, id));
        } catch (err) {
          console.warn('Failed to evict composition detail cache', err);
        }
      }
    },
    [activeUserId, token, saveToCache, isCurrentSession]
  );

  const value = useMemo(
    () => ({
      compositions,
      compositionsById,
      loading,
      usingCache,
      refresh,
      loadComposition,
      saveComposition,
      removeComposition,
    }),
    [
      compositions,
      compositionsById,
      loading,
      usingCache,
      refresh,
      loadComposition,
      saveComposition,
      removeComposition,
    ]
  );

  return <CompositionsContext.Provider value={value}>{children}</CompositionsContext.Provider>;
}

export function useCompositions() {
  const ctx = useContext(CompositionsContext);
  if (!ctx) throw new Error('useCompositions must be used within CompositionsProvider');
  return ctx;
}
