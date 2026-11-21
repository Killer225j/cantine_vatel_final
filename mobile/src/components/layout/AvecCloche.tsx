import { ReactNode, useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cantineApi } from '../../api/cantine.api';
import { usePolling } from '../../hooks/usePolling';
import { Colors } from '../../constants/colors';

/** Cloche des notifications, en haut à droite de tous les écrans d'un espace. */
function Cloche() {
  const insets = useSafeAreaInsets();
  const [nonLues, setNonLues] = useState(0);
  const [actif, setActif] = useState(false);

  const charger = useCallback(async () => {
    try {
      setNonLues((await cantineApi.notifications()).nonLues);
    } catch {
      /* la cloche reste affichée sans pastille */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActif(true);
      return () => setActif(false);
    }, []),
  );
  usePolling({ fn: charger, interval: 30000, enabled: actif });

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={[styles.cloche, { top: insets.top + 8 }]}
      accessibilityRole="button"
      accessibilityLabel={`Notifications${nonLues ? `, ${nonLues} non lues` : ''}`}
    >
      <Ionicons name="notifications-outline" size={21} color={Colors.textPrimary} />
      {nonLues > 0 && (
        <View style={styles.pastille}>
          <Text style={styles.pastilleTexte}>{nonLues > 9 ? '9+' : nonLues}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Enveloppe d'un espace (élève, parent, cuisine) : ses onglets + la cloche partout. */
export function AvecCloche({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <Cloche />
    </View>
  );
}

const styles = StyleSheet.create({
  cloche: {
    position: 'absolute',
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d3a5c',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 20,
  },
  pastille: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pastilleTexte: { color: Colors.white, fontSize: 10, fontWeight: '800' },
});
