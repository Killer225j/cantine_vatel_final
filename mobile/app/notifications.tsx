import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ListeSkeleton } from '../src/components/ui/Skeleton';
import { Colors } from '../src/constants/colors';
import { cantineApi, Notification } from '../src/api/cantine.api';
import { getApiErrorMessage } from '../src/utils/apiError';

const ICONE: Record<string, keyof typeof Ionicons.glyphMap> = {
  SOLDE_BAS: 'wallet-outline',
  RECHARGE: 'card-outline',
  ANTI_GASPI: 'leaf-outline',
};

const quand = (iso: string) => {
  const d = new Date(iso);
  const jour = d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  return jour
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** Notifications : solde bas, recharges reçues, offres anti-gaspi. Non lues d'abord. */
export default function Notifications() {
  const [liste, setListe] = useState<Notification[] | null>(null);
  const [nonLues, setNonLues] = useState(0);
  const [erreur, setErreur] = useState('');
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await cantineApi.notifications();
      setListe(r.notifications);
      setNonLues(r.nonLues);
      setErreur('');
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger vos notifications.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const toutLire = async () => {
    await cantineApi.toutLire().catch(() => undefined);
    charger();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => {
              setRafraichit(true);
              await charger();
              setRafraichit(false);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.haut}>
          <TouchableOpacity onPress={() => router.back()} style={styles.retour} accessibilityLabel="Retour" accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.titre}>Notifications</Text>
          {nonLues > 0 ? (
            <TouchableOpacity onPress={toutLire} accessibilityRole="button">
              <Text style={styles.toutLire}>Tout marquer comme lu</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 120 }} />
          )}
        </View>

        {erreur ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={28} color={Colors.primary} />}
            title="Chargement impossible"
            subtitle={erreur}
            buttonLabel="Réessayer"
            onPress={charger}
          />
        ) : !liste ? (
          <ListeSkeleton lignes={4} />
        ) : liste.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="notifications-off-outline" size={28} color={Colors.primary} />}
            title="Rien pour l’instant"
            subtitle="Les alertes de solde, les recharges et les offres anti-gaspi apparaîtront ici."
          />
        ) : (
          liste.map((n) => (
            <View key={n.id} style={[styles.ligne, !n.lue && styles.ligneNonLue]}>
              <View style={[styles.icone, !n.lue && { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name={ICONE[n.type] ?? 'notifications-outline'} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ligneTitre}>{n.titre}</Text>
                <Text style={styles.ligneCorps}>{n.corps}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.quand}>{quand(n.creeLe)}</Text>
                {!n.lue && <View style={styles.point} />}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40 },
  haut: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  retour: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  titre: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  toutLire: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  ligne: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  ligneNonLue: { borderColor: Colors.primaryBorder },
  icone: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  ligneTitre: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  ligneCorps: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  quand: { fontSize: 11, color: Colors.textTertiary },
  point: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary },
});
