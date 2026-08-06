import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Composition, CreateCompositionDTO } from '@toposonics/types';
import {
  fetchComposition,
  fetchCompositions,
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
  compositions: Composition[];
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
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [compositionsById, setCompositionsById] = useState<Record<string, Composition>>({});
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);

  const activeUserId = user?.id ?? null;
  // Tracks the currently active user so in-flight fetches from a previous user
  // (slow network + sign-out/account-switch) can be discarded before they write state.
  const activeUserIdRef = React.useRef(activeUserId);
  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // Mirror the committed list in a ref so mutations can derive the next list synchronously
  // and persist it. Reading a variable assigned inside a functional state updater is unsafe:
  // React may run the updater during a later render, after saveToCache already ran.
  const compositionsRef = React.useRef(compositions);
  useEffect(() => {
    compositionsRef.current = compositions;
  }, [compositions]);

  const saveToCache = useCallback(async (items: Composition[]) => {
    if (!activeUserId) return;

    try {
      await AsyncStorage.setItem(
        getCompositionListCacheKey(activeUserId),
        JSON.stringify({ items, cachedAt: Date.now() })
      );
    } catch (err) {
      console.warn('Failed to cache compositions', err);
    }
  }, [activeUserId]);

  const saveDetailToCache = useCallback(async (item: Composition) => {
    if (!activeUserId) return;

    try {
      await AsyncStorage.setItem(getCompositionDetailCacheKey(activeUserId, item.id), JSON.stringify(item));
    } catch (err) {
      console.warn('Failed to cache composition detail', err);
    }
  }, [activeUserId]);

  const hydrateFromCache = useCallback(async () => {
    if (!activeUserId) return;

    try {
      const cached = await AsyncStorage.getItem(getCompositionListCacheKey(activeUserId));
      if (cached) {
        const parsed = JSON.parse(cached) as { items: Composition[] };
        setCompositions(parsed.items);
        setCompositionsById((prev) => ({
          ...prev,
          ...Object.fromEntries(parsed.items.map((c) => [c.id, c])),
        }));
        setUsingCache(true);
      }
    } catch (err) {
      console.warn('Failed to hydrate compositions cache', err);
    }
  }, [activeUserId]);

  useEffect(() => {
    setCompositions([]);
    setCompositionsById({});
    setUsingCache(false);
  }, [activeUserId]);

  const refresh = useCallback(async () => {
    if (!canUseCompositionCache(token, activeUserId)) {
      setCompositions([]);
      setCompositionsById({});
      setUsingCache(false);
      setLoading(false);
      return;
    }

    const requestUserId = activeUserId;
    setLoading(true);
    setUsingCache(false);
    try {
      const data = await fetchCompositions();
      // Discard results if the active user changed while the request was in flight,
      // so we never repopulate a signed-out screen (or another account) with A's data.
      if (activeUserIdRef.current !== requestUserId) return;
      setCompositions(data);
      setCompositionsById((prev) => ({
        ...prev,
        ...Object.fromEntries(data.map((c) => [c.id, c])),
      }));
      await saveToCache(data);
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return;
      console.warn('Falling back to cached compositions', err);
      await hydrateFromCache();
    } finally {
      if (activeUserIdRef.current === requestUserId) {
        setLoading(false);
      }
    }
  }, [activeUserId, token, hydrateFromCache, saveToCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadComposition = useCallback(
    async (id: string) => {
      if (!canUseCompositionCache(token, activeUserId)) {
        return null;
      }

      const cacheUserId = activeUserId as string;
      const requestUserId = activeUserId;

      try {
        const data = await fetchComposition(id);
        if (activeUserIdRef.current === requestUserId) {
          setCompositionsById((prev) => ({ ...prev, [id]: data }));
          await saveDetailToCache(data);
        }
        return data;
      } catch (err) {
        console.warn('Failed to fetch composition, using cache', err);
        const cached = await AsyncStorage.getItem(
          getCompositionDetailCacheKey(cacheUserId, id)
        );
        if (cached) {
          return JSON.parse(cached) as Composition;
        }
        return null;
      }
    },
    [activeUserId, token, saveDetailToCache]
  );

  const saveComposition = useCallback(
    async (payload: Omit<CreateCompositionDTO, 'userId'>) => {
      if (!canUseCompositionCache(token, activeUserId)) return null;

      const requestUserId = activeUserId;
      const created = await createComposition(payload);
      // Discard if the active user changed while the save was in flight (consistent with
      // refresh/loadComposition), so we don't write into the wrong user's state/cache.
      if (activeUserIdRef.current !== requestUserId) return created;

      // Derive the next list from the committed ref (not inside a functional updater) so the
      // exact list we persist is the one we set.
      const nextList = [created, ...compositionsRef.current];
      setCompositions(nextList);
      void saveToCache(nextList);
      setCompositionsById((prev) => ({ ...prev, [created.id]: created }));
      await saveDetailToCache(created);
      return created;
    },
    [activeUserId, token, saveDetailToCache, saveToCache]
  );

  const removeComposition = useCallback(
    async (id: string) => {
      await apiDeleteComposition(id);

      // Prune from in-memory state and the persisted caches so the deleted item
      // doesn't reappear from cache on the next mount. Derive the next list from the
      // committed ref so saveToCache persists exactly what we set.
      const nextList = compositionsRef.current.filter((c) => c.id !== id);
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
    [activeUserId, saveToCache]
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
