import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import type { Composition } from '@toposonics/types';
import { useAuth } from '../auth/AuthProvider';
import { useCompositions } from '../state/CompositionsProvider';
import { playNoteEvents, formatNoteEventsDuration } from '../services/audioPlayer';

type Props = {
  route: RouteProp<RootStackParamList, 'CompositionDetail'>;
};

export default function CompositionDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [composition, setComposition] = useState<Composition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const { token, signInWithApple, loading: authLoading } = useAuth();
  const { loadComposition: loadCompositionRecord } = useCompositions();

  useEffect(() => {
    loadCompositionData();
  }, [id, token]);

  const loadCompositionData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await loadCompositionFromStore();
      setComposition(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load composition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompositionFromStore = async () => {
    const data = await loadCompositionRecord(id);
    if (!data) {
      throw new Error('Composition not found');
    }
    return data;
  };

  const playComposition = async () => {
    if (!composition) return;

    try {
      setIsPlaying(true);
      await playNoteEvents(composition.noteEvents, { tempo: composition.tempo ?? 90 });
    } catch (error) {
      Alert.alert('Playback failed', (error as Error).message);
    } finally {
      setIsPlaying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Sign in to load this composition</Text>
        <TouchableOpacity style={styles.retryButton} onPress={signInWithApple}>
          <Text style={styles.retryButtonText}>Sign in with Apple</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!composition) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Composition not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{composition.title}</Text>
        {composition.description && (
          <Text style={styles.description}>{composition.description}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Key</Text>
            <Text style={styles.detailValue}>
              {composition.key} {composition.scale.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mode</Text>
            <Text style={styles.detailValue}>
              {composition.mappingMode.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={styles.detailValue}>{composition.noteEvents.length}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tempo</Text>
            <Text style={styles.detailValue}>{composition.tempo || 90} BPM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Length</Text>
            <Text style={styles.detailValue}>
              {formatNoteEventsDuration(composition.noteEvents, composition.tempo || 90).toFixed(1)}s
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              {new Date(composition.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonDisabled]}
          onPress={playComposition}
          disabled={isPlaying}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? 'Playing…' : '▶ Play Composition'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#1e1e26',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  detailLabel: {
    fontSize: 16,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 16,
    color: '#f9fafb',
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonDisabled: {
    opacity: 0.7,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
