import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { Composition } from '@toposonics/types';
import { API_URL } from '../config';
import { useAuth } from '../auth/AuthProvider';

const COMPOSITIONS_CACHE_KEY = '@toposonics:compositions_cache';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Compositions'>;
};

export default function CompositionsScreen({ navigation }: Props) {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const { token, loading: authLoading, signInWithApple } = useAuth();

  useEffect(() => {
    loadCompositions();
  }, [token]);

  const loadCompositions = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsUsingCache(false);

    try {
      // Try to fetch from API
      const response = await fetch(`${API_URL}/compositions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      const fetchedCompositions = data.data || [];

      setCompositions(fetchedCompositions);
      setIsUsingCache(false);

      // Cache the successfully fetched data
      try {
        await AsyncStorage.setItem(
          COMPOSITIONS_CACHE_KEY,
          JSON.stringify({
            compositions: fetchedCompositions,
            cachedAt: new Date().toISOString(),
          })
        );
      } catch (cacheErr) {
        console.warn('Failed to cache compositions:', cacheErr);
      }
    } catch (err) {
      console.error('API fetch failed:', err);

      // Try to load from cache as fallback
      try {
        const cachedData = await AsyncStorage.getItem(COMPOSITIONS_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setCompositions(parsed.compositions || []);
          setIsUsingCache(true);
          setError(null); // Clear error since we have cached data
        } else {
          setError('Failed to load compositions. No cached data available.');
        }
      } catch (cacheErr) {
        console.error('Cache load failed:', cacheErr);
        setError('Failed to load compositions. Is the API running?');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading compositions...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Sign in to view your compositions</Text>
        <TouchableOpacity style={styles.retryButton} onPress={signInWithApple}>
          <Text style={styles.retryButtonText}>Sign in with Apple</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCompositions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (compositions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyTitle}>No compositions yet</Text>
        <Text style={styles.emptyText}>
          Create your first soundscape in the editor
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('Editor')}
        >
          <Text style={styles.createButtonText}>Open Editor</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isUsingCache && (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerIcon}>📡</Text>
          <View style={styles.cacheBannerContent}>
            <Text style={styles.cacheBannerTitle}>Offline Mode</Text>
            <Text style={styles.cacheBannerText}>
              Showing cached compositions. Pull to refresh when online.
            </Text>
          </View>
        </View>
      )}
      <FlatList
        data={compositions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CompositionDetail', { id: item.id })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.cardDescription}>{item.description}</Text>
            )}
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>
                {item.key} {item.scale.replace('_', ' ')}
              </Text>
              <Text style={styles.cardMetaText}>
                {item.noteEvents.length} notes
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        onRefresh={loadCompositions}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cacheBanner: {
    backgroundColor: '#fbbf24',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
  },
  cacheBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cacheBannerContent: {
    flex: 1,
  },
  cacheBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 2,
  },
  cacheBannerText: {
    fontSize: 12,
    color: '#92400e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e1e26',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
