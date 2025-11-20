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
import { API_URL } from '../config';
import { useAuth } from '../auth/AuthProvider';

type Props = {
  route: RouteProp<RootStackParamList, 'CompositionDetail'>;
};

export default function CompositionDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [composition, setComposition] = useState<Composition | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, signInWithApple, loading: authLoading } = useAuth();

  useEffect(() => {
    loadComposition();
  }, [id, token]);

  const loadComposition = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/compositions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setComposition(data.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load composition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playComposition = () => {
    Alert.alert(
      'Playback',
      'Audio playback would use expo-av to play simplified tones for each note event.\n\n' +
        'Full synthesis engine integration is planned for future releases.'
    );
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
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              {new Date(composition.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.playButton} onPress={playComposition}>
          <Text style={styles.playButtonText}>▶ Play Composition</Text>
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
  playButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
