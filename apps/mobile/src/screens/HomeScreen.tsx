import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>TopoSonics Mobile</Text>
        <Text style={styles.subtitle}>
          Transform images into musical landscapes on the go
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('Editor')}
        >
          <Text style={styles.buttonText}>Create Soundscape</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Compositions')}
        >
          <Text style={styles.buttonText}>View Compositions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>📸</Text>
          <Text style={styles.infoTitle}>Capture or Select</Text>
          <Text style={styles.infoText}>
            Use your camera or pick from gallery
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🎼</Text>
          <Text style={styles.infoTitle}>Configure</Text>
          <Text style={styles.infoText}>
            Choose key, scale, and sound preset
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🎵</Text>
          <Text style={styles.infoTitle}>Generate & Play</Text>
          <Text style={styles.infoText}>
            Hear your visual soundscape instantly
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  hero: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0284c7',
  },
  secondaryButton: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#1e1e26',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
