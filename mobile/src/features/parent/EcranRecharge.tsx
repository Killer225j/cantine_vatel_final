import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { cantineApi, Enfant, fcfa, Moyen, Recharge } from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';

const MONTANTS = [2000, 5000, 10000, 20000];
const MOYENS: { code: Moyen; libelle: string; couleur: string }[] = [
  { code: 'WAVE', libelle: 'Wave', couleur: '#1dc8ff' },
  { code: 'ORANGE_MONEY', libelle: 'Orange Money', couleur: '#ff7900' },
  { code: 'MTN_MOMO', libelle: 'MTN MoMo', couleur: '#ffcc00' },
  { code: 'MOOV_MONEY', libelle: 'Moov Money', couleur: '#0a6ebd' },
];

/** Recharge du portefeuille d'un enfant : montant, moyen, page de paiement simulée, reçu. */
export function EcranRecharge() {
  const params = useLocalSearchParams<{ enfantId?: string }>();
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [enfantId, setEnfantId] = useState<string | null>(params.enfantId ?? null);
  const [montant, setMontant] = useState<number | null>(5000);
  const [libre, setLibre] = useState('');
  const [moyen, setMoyen] = useState<Moyen>('WAVE');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [recharge, setRecharge] = useState<Recharge | null>(null);
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null);

  const chargerEnfants = useCallback(async () => {
    try {
      const liste = await cantineApi.enfants();
      setEnfants(liste);
      setEnfantId((actuel) => (actuel && liste.some((e) => e.id === actuel) ? actuel : (liste[0]?.id ?? null)));
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger vos enfants.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      chargerEnfants();
    }, [chargerEnfants]),
  );

  useEffect(() => {
    if (params.enfantId) setEnfantId(params.enfantId);
  }, [params.enfantId]);

  const arreter = () => {
    if (minuterie.current) clearInterval(minuterie.current);
    minuterie.current = null;
  };
  useEffect(() => arreter, []);

  // Tant que le paiement est en attente, on interroge l'API toutes les 3 s.
  const surveiller = (id: string) => {
    arreter();
    minuterie.current = setInterval(async () => {
      try {
        const r = await cantineApi.recharge(id);
        setRecharge(r);
        if (r.statut !== 'EN_ATTENTE') {
          arreter();
          chargerEnfants();
        }
      } catch {
        /* on réessaie au prochain tour */
      }
    }, 3000);
  };

  const montantFinal = libre ? Number(libre.replace(/\D/g, '')) : montant;
  const enfant = enfants.find((e) => e.id === enfantId) ?? null;
  const valide = !!enfant && !!montantFinal && montantFinal >= 500 && montantFinal <= 100000;

  const payer = async () => {
    if (!valide || !montantFinal) return;
    setEnvoi(true);
    setErreur('');
    try {
      const r = await cantineApi.recharger(montantFinal, moyen, enfantId ?? undefined);
      setRecharge(r);
      surveiller(r.id);
      if (r.urlPaiement) await Linking.openURL(r.urlPaiement);
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'La recharge n’a pas pu démarrer.'));
    } finally {
      setEnvoi(false);
    }
  };

  const recommencer = () => {
    arreter();
    setRecharge(null);
    setErreur('');
  };

  // ─── Résultat ───
  if (recharge) {
    const reussie = recharge.statut === 'REUSSIE';
    const echouee = recharge.statut === 'ECHOUEE';
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingTop: 48 }]}>
          <View style={[styles.rond, { backgroundColor: reussie ? Colors.success : echouee ? Colors.error : Colors.primary }]}>
            <Ionicons name={reussie ? 'checkmark' : echouee ? 'close' : 'time-outline'} size={40} color={Colors.white} />
          </View>
          <Text style={styles.resultatTitre}>
            {reussie ? 'Recharge réussie' : echouee ? 'Paiement échoué' : 'En attente du paiement'}
          </Text>
          <Text style={styles.resultatMontant}>{fcfa(recharge.montant)}</Text>
          <Text style={styles.resultatTexte}>
            {reussie
              ? `Le solde de ${recharge.beneficiaire} a été crédité.`
              : echouee
                ? 'Aucun montant n’a été débité. Vous pouvez réessayer.'
                : `Terminez le paiement ${recharge.moyenLibelle ?? ''} dans votre navigateur, puis revenez ici.`}
          </Text>
          {reussie && recharge.reference ? <Text style={styles.recu}>Reçu {recharge.reference}</Text> : null}
          <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
            {!reussie && !echouee && recharge.urlPaiement ? (
              <Button label="Rouvrir la page de paiement" onPress={() => Linking.openURL(recharge.urlPaiement as string)} />
            ) : null}
            <Button label={reussie ? 'Nouvelle recharge' : echouee ? 'Réessayer' : 'Annuler'} variant={reussie ? 'primary' : 'outline'} onPress={recommencer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Formulaire ───
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.surtitre}>Parent</Text>
        <Text style={styles.titre}>Recharger</Text>

        {enfants.length === 0 && !erreur ? (
          <Text style={styles.aide}>Liez d’abord un enfant depuis l’onglet « Enfants » pour pouvoir le recharger.</Text>
        ) : (
          <>
            {enfants.length > 1 && (
              <>
                <Text style={styles.section}>Pour qui ?</Text>
                <View style={styles.rangee}>
                  {enfants.map((e) => (
                    <Puce key={e.id} actif={e.id === enfantId} libelle={e.prenom ?? e.nom} onPress={() => setEnfantId(e.id)} />
                  ))}
                </View>
              </>
            )}
            {enfant && (
              <View style={styles.cible}>
                <Text style={styles.cibleNom}>{enfant.nom}</Text>
                <Text style={styles.cibleSolde}>Solde actuel : {fcfa(enfant.solde)}</Text>
              </View>
            )}

            <Text style={styles.section}>Montant</Text>
            <View style={styles.rangee}>
              {MONTANTS.map((m) => (
                <Puce
                  key={m}
                  actif={!libre && montant === m}
                  libelle={fcfa(m)}
                  onPress={() => {
                    setLibre('');
                    setMontant(m);
                  }}
                />
              ))}
            </View>
            <TextInput
              value={libre}
              onChangeText={(t) => setLibre(t.replace(/\D/g, ''))}
              placeholder="Autre montant (500 à 100 000)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              style={styles.champ}
            />

            <Text style={styles.section}>Moyen de paiement</Text>
            {MOYENS.map((m) => (
              <TouchableOpacity
                key={m.code}
                onPress={() => setMoyen(m.code)}
                style={[styles.moyen, moyen === m.code && styles.moyenActif]}
                accessibilityRole="radio"
                accessibilityState={{ selected: moyen === m.code }}
              >
                <View style={[styles.pastille, { backgroundColor: m.couleur }]} />
                <Text style={styles.moyenLibelle}>{m.libelle}</Text>
                {moyen === m.code && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            <Text style={styles.simule}>Paiement simulé pour la démonstration : aucun argent n’est débité.</Text>

            {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
            <Button
              label={valide && montantFinal ? `Recharger ${fcfa(montantFinal)}` : 'Recharger'}
              loading={envoi}
              disabled={!valide}
              onPress={payer}
              style={{ marginTop: 14 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Puce({ actif, libelle, onPress }: { actif: boolean; libelle: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.puce, actif && styles.puceActive]} accessibilityRole="button" accessibilityState={{ selected: actif }}>
      <Text style={[styles.puceTexte, actif && { color: Colors.white }]}>{libelle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40 },
  surtitre: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 8 },
  aide: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  section: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 },
  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  puceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  puceTexte: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  cible: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginTop: 8 },
  cibleNom: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cibleSolde: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  champ: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 14, fontSize: 16, color: Colors.textPrimary, marginTop: 10 },
  moyen: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginBottom: 8 },
  moyenActif: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  pastille: { width: 22, height: 22, borderRadius: 11 },
  moyenLibelle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  simule: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  erreur: { color: Colors.error, fontSize: 13, fontWeight: '600', marginTop: 10 },
  rond: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  resultatTitre: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  resultatMontant: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, marginVertical: 6 },
  resultatTexte: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  recu: { fontFamily: undefined, fontWeight: '800', color: Colors.primaryDark, marginTop: 12, letterSpacing: 1 },
});
