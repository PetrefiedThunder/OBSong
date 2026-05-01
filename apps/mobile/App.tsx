import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import CompositionsScreen from './src/screens/CompositionsScreen';
import CompositionDetailScreen from './src/screens/CompositionDetailScreen';
import { AuthProvider } from './src/auth/AuthProvider';
import { CompositionsProvider } from './src/state/CompositionsProvider';

const ONBOARDING_COMPLETE_KEY = '@toposonics:onboardingComplete';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Editor: undefined;
  Compositions: undefined;
  CompositionDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'Welcome' | 'Home'>('Welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    setIsLoading(true);
    setStartupError(null);

    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      if (value !== null) {
        setInitialRoute('Home');
      }
    } catch (error) {
      console.error('Failed to get onboarding status', error);
      setStartupError('TopoSonics could not check your saved startup state.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  useEffect(() => {
    if (!SENTRY_DSN) {
      return;
    }

    let isActive = true;

    void import('sentry-expo')
      .then((Sentry) => {
        if (!isActive) {
          return;
        }

        Sentry.init({
          dsn: SENTRY_DSN,
          enableInExpoDevelopment: true,
          debug: __DEV__,
        });
      })
      .catch((error) => {
        console.warn('Sentry initialization skipped', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={styles.startupContainer}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="TopoSonics is loading"
        accessibilityHint="Checking your saved startup state"
      >
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.startupTitle}>TopoSonics</Text>
        <Text style={styles.startupText}>Checking your saved session...</Text>
      </View>
    );
  }

  if (startupError) {
    return (
      <View
        style={styles.startupContainer}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={startupError}
      >
        <StatusBar style="light" />
        <Text style={styles.startupTitle}>Startup issue</Text>
        <Text style={styles.startupText}>{startupError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void checkOnboardingStatus()}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AuthProvider>
      <CompositionsProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerStyle: {
                backgroundColor: '#14141a',
              },
              headerTintColor: '#f9fafb',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: '#0a0a0f',
              },
            }}
          >
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: '🎵 TopoSonics' }}
            />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={{ title: 'Editor' }}
            />
            <Stack.Screen
              name="Compositions"
              component={CompositionsScreen}
              options={{ title: 'Compositions' }}
            />
            <Stack.Screen
              name="CompositionDetail"
              component={CompositionDetailScreen}
              options={{ title: 'Composition' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CompositionsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  startupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#0a0a0f',
  },
  startupTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  startupText: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
