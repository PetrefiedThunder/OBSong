import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { KeyType, ScaleType } from '@toposonics/types';
import { mapLinearLandscape } from '@toposonics/core-audio';

export default function EditorScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [key] = useState<KeyType>('C');
  const [scale] = useState<ScaleType>('C_MAJOR');

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

  const generateComposition = () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please select or capture an image first');
      return;
    }

    // TODO: Implement full image analysis pipeline for React Native
    // This would require extracting pixel data from the image URI
    // For now, show a placeholder message

    Alert.alert(
      'Coming Soon',
      'Full image analysis and audio playback will be implemented using:\n\n' +
        '• expo-image-manipulator for pixel extraction\n' +
        '• @toposonics/core-image for analysis\n' +
        '• @toposonics/core-audio for mapping\n' +
        '• expo-av for simplified playback\n\n' +
        `Image URI: ${imageUri}\n` +
        `Key: ${key}\n` +
        `Scale: ${scale}`
    );
  };

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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Musical Parameters</Text>
        <View style={styles.paramCard}>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Key</Text>
            <Text style={styles.paramValue}>{key}</Text>
          </View>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Scale</Text>
            <Text style={styles.paramValue}>{scale.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.paramNote}>
            Full configuration controls coming soon
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Generate</Text>
        <TouchableOpacity
          style={[styles.generateButton, !imageUri && styles.disabledButton]}
          onPress={generateComposition}
          disabled={!imageUri}
        >
          <Text style={styles.generateButtonText}>Generate Composition</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.infoText}>
          This is a simplified mobile implementation demonstrating integration
          with shared @toposonics packages. Full features include:
        </Text>
        <Text style={styles.featureList}>
          • Image pixel extraction{'\n'}
          • Brightness & depth analysis{'\n'}
          • Note event generation{'\n'}
          • Audio playback with expo-av{'\n'}
          • Saving to backend API
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
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  paramLabel: {
    fontSize: 16,
    color: '#9ca3af',
  },
  paramValue: {
    fontSize: 16,
    color: '#f9fafb',
    fontWeight: '600',
  },
  paramNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
