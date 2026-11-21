import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { cantineApi, fcfa, Moyen, Recharge, Transaction } from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { lirePrefs } from '../../utils/prefs';

export type OngletSolde = 'recharger' | 'historique';

const MONTANTS = [1000, 2000, 5000, 10000];
const MOYENS: { code: Moyen; libelle: string; couleur: string }[] = [
  { code: 'WAVE', libelle: 'Wave', couleur: '#1dc8ff' },
  { code: 'ORANGE_MONEY', libelle: 'Orange Money', couleur: '#ff7900' },
  { code: 'MTN_MOMO', libelle: 'MTN MoMo', couleur: '#ffcc00' },
  { code: 'MOOV_MONEY', libelle: 'Moov Money', couleur: '#0a6ebd' },
];

interface Props {
  visible: boolean;
  onglet: OngletSolde;
  solde: number | null;
  onClose: () => void;
  /** Appelé quand un paiement a abouti, pour rafraîchir le solde affiché. */
  onRecharge: () => void;
}

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Recharger son propre compte ou revoir son historique : chaque bouton ouvre sa propre fenêtre. */
export function SoldeSheet({ visible, onglet: ongletInitial, solde, onClose, onRecharge }: Props) {
  const [onglet, setOnglet] = useState<OngletSolde>(ongletInitial);
  const [montant, setMontant] = useState<number | null>(5000);
  const [libre, setLibre] = useState('');
  const [moyen, setMoyen] = useState<Moyen>('WAVE');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [recharge, setRecharge] = useState<Recharge | null>(null);
  const [historique, setHistorique] = useState<Transaction[] | null>(null);
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null);

  const arreter = () => {
    if (minuterie.current) clearInterval(minuterie.current);
    minuterie.current = null;
  };
  useEffect(() => arreter, []);

  const chargerHistorique = useCallback(async () => {
    try {
      setHistorique(await cantineApi.mesTransactions());
    } catch {
      setHistorique([]);
    }
  }, []);

  // À chaque ouverture : onglet demandé, formulaire neuf, moyen de paiement préféré.
  useEffect(() => {
    if (!visible) return;
    setOnglet(ongletInitial);
    setRecharge(null);
    setErreur('');
    setLibre('');
    lirePrefs().then((p) => setMoyen(p.moyen));
    chargerHistorique();
  }, [visible, ongletInitial, chargerHistorique]);

  const montantFinal = libre ? Number(libre.replace(/\D/g, '')) : montant;
  const valide = !!montantFinal && montantFinal >= 500 && montantFinal <= 100000;

  const surveiller = (id: string) => {
    arreter();
    minuterie.current = setInterval(async () => {
      try {
        const r = await cantineApi.recharge(id);
        setRecharge(r);
        if (r.statut !== 'EN_ATTENTE') {
          arreter();
          onRecharge();
          chargerHistorique();
        }
      } catch {
        /* nouvel essai au prochain tour */
      }
    }, 3000);
  };

  const payer = async () => {
    if (!valide || !montantFinal) return;
    setEnvoi(true);
    setErreur('');
    try {
      const r = await cantineApi.recharger(montantFinal, moyen);
      setRecharge(r);
      surveiller(r.id);
      if (r.urlPaiement) await Linking.openURL(r.urlPaiement);
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'La recharge n’a pas pu démarrer.'));
    } finally {
      setEnvoi(false);
    }
  };

  const fermer = () => {
    arreter();
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={fermer} title={onglet === 'historique' ? 'Historique du solde' : 'Recharger mon solde'}>
      <View style={styles.entete}>
        <Text style={styles.enteteLibelle}>Solde actuel</Text>
        <Text style={styles.enteteMontant}>{solde === null ? '—' : fcfa(solde)}</Text>
      </View>

      {onglet === 'recharger' && !recharge && (
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <Text style={styles.section}>Montant</Text>
          <View style={styles.rangee}>
            {MONTANTS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  setLibre('');
                  setMontant(m);
                }}
                style={[styles.puce, !libre && montant === m && styles.puceActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: !libre && montant === m }}
              >
                <Text style={[styles.puceTexte, !libre && montant === m && { color: Colors.white }]}>{fcfa(m)}</Text>
              </TouchableOpacity>
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
          />
        </View>
      )}

      {onglet === 'recharger' && recharge && (
        <View style={styles.resultat}>
          <View
            style={[
              styles.rond,
              { backgroundColor: recharge.statut === 'REUSSIE' ? Colors.success : recharge.statut === 'ECHOUEE' ? Colors.error : Colors.primary },
            ]}
          >
            <Ionicons
              name={recharge.statut === 'REUSSIE' ? 'checkmark' : recharge.statut === 'ECHOUEE' ? 'close' : 'time-outline'}
              size={34}
              color={Colors.white}
            />
          </View>
          <Text style={styles.resultatTitre}>
            {recharge.statut === 'REUSSIE' ? 'Recharge réussie' : recharge.statut === 'ECHOUEE' ? 'Paiement échoué' : 'En attente du paiement'}
          </Text>
          <Text style={styles.resultatMontant}>{fcfa(recharge.montant)}</Text>
          <Text style={styles.resultatTexte}>
            {recharge.statut === 'REUSSIE'
              ? 'Votre solde a été crédité.'
              : recharge.statut === 'ECHOUEE'
                ? 'Aucun montant n’a été débité. Vous pouvez réessayer.'
                : `Terminez le paiement ${recharge.moyenLibelle ?? ''} dans votre navigateur, puis revenez ici.`}
          </Text>
          {recharge.statut === 'REUSSIE' && recharge.reference ? <Text style={styles.recu}>Reçu {recharge.reference}</Text> : null}
          <View style={{ width: '100%', gap: 10, marginTop: 8, paddingBottom: 12 }}>
            {recharge.statut === 'EN_ATTENTE' && recharge.urlPaiement ? (
              <Button label="Rouvrir la page de paiement" onPress={() => Linking.openURL(recharge.urlPaiement as string)} />
            ) : null}
            {recharge.statut === 'REUSSIE' ? (
              <Button label="Terminé" onPress={fermer} />
            ) : (
              <Button
                label={recharge.statut === 'ECHOUEE' ? 'Réessayer' : 'Annuler'}
                variant="outline"
                onPress={() => {
                  arreter();
                  setRecharge(null);
                }}
              />
            )}
          </View>
        </View>
      )}

      {onglet === 'historique' && (
        <View style={{ paddingBottom: 12 }}>
          {!historique ? (
            <Text style={styles.vide}>Chargement…</Text>
          ) : historique.length === 0 ? (
            <Text style={styles.vide}>Aucune opération pour l’instant.</Text>
          ) : (
            historique.map((t) => (
              <View key={t.id} style={styles.ligne}>
                <View style={[styles.icone, { backgroundColor: t.montant > 0 ? Colors.successLight : Colors.borderLight }]}>
                  <Ionicons name={t.type === 'REPAS' ? 'restaurant-outline' : t.type === 'RECHARGE' ? 'add-circle-outline' : 'return-down-back-outline'} size={18} color={t.montant > 0 ? Colors.success : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ligneLibelle} numberOfLines={1}>
                    {t.libelle}
                  </Text>
                  <Text style={styles.ligneDate}>
                    {dateCourte(t.creeLe)}
                    {t.statut !== 'REUSSIE' ? ` · ${t.statut === 'EN_ATTENTE' ? 'en attente' : 'échouée'}` : ''}
                  </Text>
                </View>
                <Text style={[styles.ligneMontant, { color: t.montant > 0 ? Colors.success : Colors.textMuted }, t.statut !== 'REUSSIE' && { opacity: 0.45 }]}>
                  {t.montant > 0 ? '+' : ''}
                  {fcfa(t.montant)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  entete: { backgroundColor: '#0d3a5c', borderRadius: 16, padding: 16, marginBottom: 14 },
  enteteLibelle: { fontSize: 12, color: Colors.primaryBorder, fontWeight: '600' },
  enteteMontant: { fontSize: 28, fontWeight: '800', color: Colors.white, marginTop: 2 },
  onglets: { flexDirection: 'row', backgroundColor: Colors.borderLight, borderRadius: 14, padding: 4, marginBottom: 14 },
  onglet: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  ongletActif: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  ongletTexte: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  puceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  puceTexte: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  champ: { height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary },
  moyen: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  moyenActif: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  pastille: { width: 20, height: 20, borderRadius: 10 },
  moyenLibelle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  simule: { fontSize: 12, color: Colors.textSecondary },
  erreur: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  resultat: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  rond: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  resultatTitre: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  resultatMontant: { fontSize: 26, fontWeight: '800', color: Colors.primaryDark },
  resultatTexte: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  recu: { fontWeight: '800', color: Colors.primaryDark, letterSpacing: 1, marginTop: 4 },
  vide: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  icone: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ligneLibelle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  ligneDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ligneMontant: { fontSize: 14, fontWeight: '800' },
});
