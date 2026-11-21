import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/features/auth/useAuth';

SplashScreen.preventAutoHideAsync();

// Version web (démo dans le navigateur) : react-native-svg transmet deux propriétés que le DOM n'aime pas.
// Sans effet visible, et absent sur téléphone ; on évite seulement la pastille rouge de développement.
LogBox.ignoreLogs(['non-boolean attribute', 'Invalid DOM property']);

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(eleve)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(cuisine)" />
        <Stack.Screen name="notifications" />
      </Stack>
    </AuthProvider>
  );
}