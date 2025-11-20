import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import CompositionsScreen from './src/screens/CompositionsScreen';
import CompositionDetailScreen from './src/screens/CompositionDetailScreen';
import { AuthProvider } from './src/auth/AuthProvider';
import { CompositionsProvider } from './src/state/CompositionsProvider';

export type RootStackParamList = {
  Home: undefined;
  Editor: undefined;
  Compositions: undefined;
  CompositionDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AuthProvider>
      <CompositionsProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
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
