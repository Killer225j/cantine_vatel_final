import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Config } from '../constants/config';

/**
 * Les jetons vont dans le trousseau chiffré du téléphone (expo-secure-store) : AsyncStorage est
 * un simple fichier en clair, lisible sur un appareil compromis. Le profil affiché, qui n'est
 * pas un secret, reste dans AsyncStorage. Sur le web (dev uniquement), SecureStore n'existe pas.
 */
const secure = {
  get: (cle: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(cle) : SecureStore.getItemAsync(cle),
  set: (cle: string, valeur: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(cle, valeur) : SecureStore.setItemAsync(cle, valeur),
  remove: (cle: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(cle) : SecureStore.deleteItemAsync(cle),
};

export const storage = {
  getToken: async (): Promise<string | null> => {
    try {
      return await secure.get(Config.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await secure.get(Config.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    try {
      await Promise.all([
        secure.set(Config.ACCESS_TOKEN_KEY, accessToken),
        secure.set(Config.REFRESH_TOKEN_KEY, refreshToken),
      ]);
    } catch {}
  },

  // Cache local pour l'affichage — pas la source de vérité.
  getUser: async <T>(): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(Config.USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  setUser: async <T>(user: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(Config.USER_KEY, JSON.stringify(user));
    } catch {}
  },

  clear: async (): Promise<void> => {
    try {
      await Promise.all([
        secure.remove(Config.ACCESS_TOKEN_KEY),
        secure.remove(Config.REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(Config.USER_KEY),
      ]);
    } catch {}
  },
};
