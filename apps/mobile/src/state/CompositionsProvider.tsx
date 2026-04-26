import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Composition, CreateCompositionDTO } from '@toposonics/types';
import { fetchComposition, fetchCompositions, createComposition } from '../services/apiClient';
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
}

const CompositionsContext = createContext<CompositionsContextValue | undefined>(undefined);

export function CompositionsProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [compositionsById, setCompositionsById] = useState<Record<string, Composition>>({});
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);

  const activeUserId = user?.id ?? null;

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

    setLoading(true);
    setUsingCache(false);
    try {
      const data = await fetchCompositions();
      setCompositions(data);
      setCompositionsById((prev) => ({
        ...prev,
        ...Object.fromEntries(data.map((c) => [c.id, c])),
      }));
      await saveToCache(data);
    } catch (err) {
      console.warn('Falling back to cached compositions', err);
      await hydrateFromCache();
    } finally {
      setLoading(false);
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

      try {
        const data = await fetchComposition(id);
        setCompositionsById((prev) => ({ ...prev, [id]: data }));
        await saveDetailToCache(data);
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

      const created = await createComposition(payload);
      setCompositions((prev) => {
        const next = [created, ...prev];
        saveToCache(next);
        return next;
      });
      setCompositionsById((prev) => ({ ...prev, [created.id]: created }));
      await saveDetailToCache(created);
      return created;
    },
    [activeUserId, token, saveDetailToCache, saveToCache]
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
    }),
    [compositions, compositionsById, loading, usingCache, refresh, loadComposition, saveComposition]
  );

  return <CompositionsContext.Provider value={value}>{children}</CompositionsContext.Provider>;
}

export function useCompositions() {
  const ctx = useContext(CompositionsContext);
  if (!ctx) throw new Error('useCompositions must be used within CompositionsProvider');
  return ctx;
}
