import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from 'sentry-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import CompositionsScreen from './src/screens/CompositionsScreen';
import CompositionDetailScreen from './src/screens/CompositionDetailScreen';
import { AuthProvider } from './src/auth/AuthProvider';
import { CompositionsProvider } from './src/state/CompositionsProvider';

const ONBOARDING_COMPLETE_KEY = '@toposonics:onboardingComplete';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableInExpoDevelopment: true,
  debug: true, // If `true`, Sentry will print debugging information if error sending failed.
});

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

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (value !== null) {
          setInitialRoute('Home');
        }
      } catch (error) {
        console.error('Failed to get onboarding status', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (isLoading) {
    return null; // Or a loading spinner
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
