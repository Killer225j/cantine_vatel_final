import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListeSkeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { cantineApi, Commandes, heure, StatutReservation } from '../../api/cantine.api';
import { usePolling } from '../../hooks/usePolling';
import { getApiErrorMessage } from '../../utils/apiError';

const STATUT: Record<StatutReservation, { libelle: string; ton: BadgeTone }> = {
  CONFIRMEE: { libelle: 'À servir', ton: 'info' },
  SERVIE: { libelle: 'Servie', ton: 'succes' },
  ABSENT: { libelle: 'Absent', ton: 'attention' },
  ANNULEE: { libelle: 'Annulée', ton: 'neutre' },
};

type Filtre = 'TOUS' | StatutReservation | 'RISQUE';

/** Commandes du jour pour la cuisine : compteurs, filtres, élèves à risque allergique. */
export function EcranCommandes() {
  const [donnees, setDonnees] = useState<Commandes | null>(null);
  const [erreur, setErreur] = useState('');
  const [rafraichit, setRafraichit] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('TOUS');
  const [recherche, setRecherche] = useState('');
  const [actif, setActif] = useState(false);

  const charger = useCallback(async () => {
    try {
      setDonnees(await cantineApi.commandes());
      setErreur('');
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger les commandes.'));
    }
  }, []);

  // Actif seulement quand l'onglet est à l'écran : rafraîchit toutes les 20 s.
  useFocusEffect(
    useCallback(() => {
      setActif(true);
      return () => setActif(false);
    }, []),
  );
  usePolling({ fn: charger, interval: 20000, enabled: actif });

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (donnees?.reservations ?? []).filter(
      (r) =>
        (filtre === 'TOUS' ||
          (filtre === 'RISQUE' ? r.alertesAllergie.length > 0 && r.statut !== 'ANNULEE' : r.statut === filtre)) &&
        (!q || r.eleve.nom.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)),
    );
  }, [donnees, filtre, recherche]);

  const c = donnees?.compteurs;
  const filtres: { cle: Filtre; libelle: string }[] = [
    { cle: 'TOUS', libelle: 'Toutes' },
    { cle: 'CONFIRMEE', libelle: `À servir${c ? ` (${c.aServir})` : ''}` },
    { cle: 'SERVIE', libelle: `Servies${c ? ` (${c.servies})` : ''}` },
    { cle: 'RISQUE', libelle: `Allergie${c ? ` (${c.aRisqueAllergique})` : ''}` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
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
        <Text style={styles.surtitre}>Cuisine</Text>
        <Text style={styles.titre}>Commandes du jour</Text>

        {c && (
          <View style={styles.compteurs}>
            <Tuile valeur={c.total} libelle="Réservées" />
            <Tuile valeur={c.servies} libelle="Servies" couleur={Colors.success} />
            <Tuile valeur={c.aServir} libelle="À servir" couleur={Colors.primary} />
          </View>
        )}

        {c && c.aRisqueAllergique > 0 && (
          <View style={styles.risque}>
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text style={styles.risqueTexte}>
              {c.aRisqueAllergique} réservations à risque allergique : le contrôle sera demandé au comptoir.
            </Text>
          </View>
        )}

        <TextInput
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher un élève ou un code"
          placeholderTextColor={Colors.textTertiary}
          style={styles.recherche}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtres}>
          {filtres.map((f) => (
            <TouchableOpacity
              key={f.cle}
              onPress={() => setFiltre(f.cle)}
              style={[styles.filtre, filtre === f.cle && styles.filtreActif]}
              accessibilityRole="button"
              accessibilityState={{ selected: filtre === f.cle }}
            >
              <Text style={[styles.filtreTexte, filtre === f.cle && { color: Colors.white }]}>{f.libelle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {erreur ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={28} color={Colors.primary} />}
            title="Chargement impossible"
            subtitle={erreur}
            buttonLabel="Réessayer"
            onPress={charger}
          />
        ) : !donnees ? (
          <ListeSkeleton lignes={4} />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="list-outline" size={28} color={Colors.primary} />}
            title="Aucune commande"
            subtitle="Aucune ligne ne correspond à ces filtres."
            buttonLabel="Tout afficher"
            onPress={() => {
              setFiltre('TOUS');
              setRecherche('');
            }}
          />
        ) : (
          visibles.map((r) => {
            const alerte = r.alertesAllergie.length > 0 && r.statut === 'CONFIRMEE';
            return (
              <View key={r.id} style={[styles.ligne, alerte && styles.ligneAlerte]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom}>
                    {r.eleve.nom} <Text style={styles.classe}>· {r.eleve.classe ?? '—'}</Text>
                  </Text>
                  <Text style={styles.plat} numberOfLines={1}>
                    {r.plat.nom} · {heure(r.creneau.heureDebut)}
                  </Text>
                  {alerte && (
                    <Text style={styles.alerte}>⚠ {r.alertesAllergie.map((a) => a.nom).join(', ')}</Text>
                  )}
                </View>
                <Badge label={STATUT[r.statut].libelle} tone={STATUT[r.statut].ton} />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tuile({ valeur, libelle, couleur = Colors.primaryDark }: { valeur: number; libelle: string; couleur?: string }) {
  return (
    <View style={styles.tuile}>
      <Text style={[styles.tuileValeur, { color: couleur }]}>{valeur}</Text>
      <Text style={styles.tuileLibelle}>{libelle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 32 },
  surtitre: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 14 },
  compteurs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tuile: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, alignItems: 'center' },
  tuileValeur: { fontSize: 24, fontWeight: '800' },
  tuileLibelle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  risque: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: Colors.errorLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  risqueTexte: { flex: 1, color: Colors.error, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  recherche: { height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 10 },
  filtres: { gap: 8, paddingBottom: 12 },
  filtre: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filtreActif: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filtreTexte: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 8 },
  ligneAlerte: { borderColor: Colors.errorBorder, backgroundColor: Colors.errorLight },
  nom: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  classe: { fontWeight: '400', color: Colors.textSecondary },
  plat: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  alerte: { fontSize: 12, fontWeight: '700', color: Colors.error, marginTop: 4 },
});
