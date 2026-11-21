import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { Colors } from '../../src/constants/colors';
import { Config } from '../../src/constants/config';
import { accueilDuRole } from '../../src/features/auth/useAuth';
import { User } from '../../src/types/api.types';
import { storage } from '../../src/utils/storage';

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => void redirect(), 1600);
    return () => clearTimeout(timer);
  }, []);

  const redirect = async () => {
    try {
      const [onboardingVu, token, user] = await Promise.all([
        AsyncStorage.getItem(Config.ONBOARDING_KEY),
        storage.getToken(),
        storage.getUser<User>(),
      ]);
      if (!onboardingVu) router.replace('/(auth)/onboarding');
      else if (token && user) router.replace(accueilDuRole(user.role) as never);
      else router.replace('/(auth)/login');
    } catch {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.name}>Cantine Vatel</Text>
        <Text style={styles.tagline}>Zéro file, zéro gaspi, zéro risque</Text>
      </Animated.View>

      <Text style={styles.version}>v{Constants.expoConfig?.version ?? '0.1.0'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: Colors.primaryLight,
    top: -140,
    right: -160,
  },
  circle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryLight,
    bottom: -120,
    left: -110,
  },
  content: { alignItems: 'center', gap: 10 },
  logo: { width: 112, height: 112, borderRadius: 26, marginBottom: 8 },
  name: { fontSize: 28, fontWeight: '700', color: Colors.primaryDark, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: Colors.textSecondary },
  version: { position: 'absolute', bottom: 40, fontSize: 12, color: Colors.textTertiary },
});
