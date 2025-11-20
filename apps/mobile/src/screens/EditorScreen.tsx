import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyType, ScaleType, NoteEvent } from '@toposonics/types';
import { useAuth } from '../auth/AuthProvider';
import {
  generateCompositionFromImage,
  type CompositionGenerationResult,
} from '../services/imageProcessing';
import { playNoteEvents, formatNoteEventsDuration } from '../services/audioPlayer';
import { useCompositions } from '../state/CompositionsProvider';

const KEYS: KeyType[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SCALES: ScaleType[] = [
  'C_MAJOR',
  'A_MINOR',
  'C_PENTATONIC',
  'A_MINOR_PENTATONIC',
  'D_DORIAN',
  'C_BLUES',
];

const DRAFT_CACHE_KEY = '@toposonics:editor:lastDraft';

export default function EditorScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyType>('C');
  const [selectedScale, setSelectedScale] = useState<ScaleType>('C_MAJOR');
  const [generation, setGeneration] = useState<CompositionGenerationResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { token, signInWithApple } = useAuth();
  const { saveComposition } = useCompositions();

  const tempo = 90;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const captureImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const storeDraft = async (payload: CompositionGenerationResult & { imageUri: string }) => {
    try {
      await AsyncStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to cache draft', err);
    }
  };

  const hydrateDraft = async () => {
    try {
      const cached = await AsyncStorage.getItem(DRAFT_CACHE_KEY);
      if (!cached) return;

      const parsed = JSON.parse(cached) as CompositionGenerationResult & { imageUri: string };
      setImageUri(parsed.imageUri);
      setSelectedKey(parsed.metadata.key);
      setSelectedScale(parsed.metadata.scale);
      setGeneration(parsed);
    } catch (err) {
      console.warn('Failed to hydrate draft', err);
    }
  };

  React.useEffect(() => {
    hydrateDraft();
  }, []);

  const clearDraft = async () => {
    setGeneration(null);
    setImageUri(null);
    try {
      await AsyncStorage.removeItem(DRAFT_CACHE_KEY);
    } catch (err) {
      console.warn('Failed to clear draft', err);
    }
  };

  const generateComposition = async () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please select or capture an image first');
      return;
    }

    try {
      setProcessing(true);
      setPlaybackStatus(null);
      const result = await generateCompositionFromImage(imageUri, {
        key: selectedKey,
        scale: selectedScale,
        maxNotes: 120,
      });
      setGeneration(result);
      await storeDraft({ ...result, imageUri });
    } catch (error) {
      Alert.alert('Generation failed', (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const playNotes = async () => {
    if (!generation) {
      Alert.alert('Nothing to play', 'Generate a composition first');
      return;
    }

    try {
      setPlaybackStatus('0');
      await playNoteEvents(generation.noteEvents, {
        tempo,
        onProgress(current, total) {
          setPlaybackStatus(`${current}/${total}`);
        },
      });
    } catch (error) {
      Alert.alert('Playback failed', (error as Error).message);
    } finally {
      setPlaybackStatus(null);
    }
  };

  const saveToBackend = async () => {
    if (!generation) {
      Alert.alert('Nothing to save', 'Generate a composition first');
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Sign in to sync compositions with the backend.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in with Apple', onPress: signInWithApple },
      ]);
      return;
    }

    try {
      setSaving(true);
      const duration = formatNoteEventsDuration(generation.noteEvents, tempo);
      const payload = {
        title: `Mobile capture ${new Date().toLocaleTimeString()}`,
        description: 'Generated on-device from an image',
        noteEvents: generation.noteEvents as NoteEvent[],
        mappingMode: 'LINEAR_LANDSCAPE' as const,
        key: selectedKey,
        scale: selectedScale,
        tempo,
        imageData: `data:image/png;base64,${generation.imageBase64}`,
        metadata: {
          imageWidth: generation.analysis.width,
          imageHeight: generation.analysis.height,
          noteCount: generation.noteEvents.length,
          duration,
        },
      };

      const saved = await saveComposition(payload);
      if (saved) {
        Alert.alert('Saved', 'Composition synced to backend');
      } else {
        Alert.alert('Save skipped', 'Unable to save without an authenticated session');
      }
    } catch (error) {
      Alert.alert('Save failed', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const generationSummary = useMemo(() => {
    if (!generation) return null;
    return {
      notes: generation.noteEvents.length,
      duration: formatNoteEventsDuration(generation.noteEvents, tempo),
      width: generation.analysis.width,
      height: generation.analysis.height,
    };
  }, [generation, tempo]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Image</Text>

        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={processing}
            >
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
              <Text style={styles.pickerIcon}>📁</Text>
              <Text style={styles.pickerText}>Pick from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerButton} onPress={captureImage}>
              <Text style={styles.pickerIcon}>📸</Text>
              <Text style={styles.pickerText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          )}
          {generation && (
            <TouchableOpacity style={styles.draftResetButton} onPress={clearDraft} disabled={processing}>
              <Text style={styles.draftResetText}>Reset draft</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Musical Parameters</Text>
        <View style={styles.paramCard}>
          <Text style={styles.paramNote}>Choose a key and scale to map brightness to pitch.</Text>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Key</Text>
            <View style={styles.optionRow}>
              {KEYS.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.optionChip, selectedKey === k && styles.optionChipActive]}
                  onPress={() => setSelectedKey(k)}
                >
                  <Text style={styles.optionChipText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Scale</Text>
            <View style={styles.optionRow}>
              {SCALES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.optionChip, selectedScale === s && styles.optionChipActive]}
                  onPress={() => setSelectedScale(s)}
                >
                  <Text style={styles.optionChipText}>{s.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Generate</Text>
        <TouchableOpacity
          style={[styles.generateButton, (!imageUri || processing) && styles.disabledButton]}
          onPress={generateComposition}
          disabled={!imageUri || processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Composition</Text>
          )}
        </TouchableOpacity>
      </View>

      {generation && generationSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Preview</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {generationSummary.notes} notes · {generationSummary.duration.toFixed(1)}s · {generationSummary.width}×
              {generationSummary.height}
            </Text>
            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.playButton} onPress={playNotes} disabled={!!playbackStatus}>
                <Text style={styles.playButtonText}>
                  {playbackStatus ? `Playing ${playbackStatus}` : '▶ Play'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveToBackend}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save to Backend'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.noteListTitle}>First 6 notes</Text>
            <View style={styles.noteRow}>
              {generation.noteEvents.slice(0, 6).map((note: NoteEvent, idx: number) => (
                <View key={`${note.note}-${idx}`} style={styles.notePill}>
                  <Text style={styles.notePillText}>{note.note}</Text>
                  <Text style={styles.notePillSub}>{note.duration?.toFixed(2)} beats</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.infoText}>
          The mobile editor now performs on-device pixel extraction (via expo-image-manipulator), decodes RGBA data, maps it
          through @toposonics/core-image and @toposonics/core-audio, and plays back a simplified tone stack with expo-av.
        </Text>
        <Text style={styles.featureList}>
          • Pixel extraction & analysis {'\n'}• Brightness-driven melody generation {'\n'}• Audio playback via expo-av
          {'\n'}• Offline caching for drafts {'\n'}• Authenticated save to the TopoSonics backend
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#1e1e26',
  },
  changeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  draftResetButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  draftResetText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#1e1e26',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
  },
  pickerIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  pickerText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  paramCard: {
    backgroundColor: '#1e1e26',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paramRow: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
  },
  optionChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  optionChipText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  paramLabel: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  paramValue: {
    fontSize: 16,
    color: '#f9fafb',
    fontWeight: '600',
  },
  paramNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#1e1e26',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryText: {
    color: '#f9fafb',
    fontSize: 14,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  noteListTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  noteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notePill: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 8,
    borderRadius: 8,
    minWidth: 70,
  },
  notePillText: {
    color: '#f9fafb',
    fontWeight: '700',
  },
  notePillSub: {
    color: '#9ca3af',
    fontSize: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    fontFamily: 'monospace',
  },
});
