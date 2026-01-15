import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';

const ONBOARDING_COMPLETE_KEY = '@toposonics:onboardingComplete';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  const handleCompleteOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      navigation.replace('Home'); // Replace to prevent going back
    } catch (error) {
      console.error('Failed to save onboarding status', error);
      // Still navigate even if saving fails
      navigation.replace('Home');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🎵</Text>
        <Text style={styles.title}>Welcome to TopoSonics</Text>
        <Text style={styles.subtitle}>
          The app that turns your images into unique musical soundscapes.
        </Text>
        <Text style={styles.description}>
          Upload a photo, choose a musical style, and let our engine analyze your visual world to compose a one-of-a-kind piece of music.
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleCompleteOnboarding}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f9fafb',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
