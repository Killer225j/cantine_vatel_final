import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListeSkeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { cantineApi, Enfant, fcfa, Transaction } from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../auth/useAuth';

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** « Mes enfants » : solde, alerte de solde bas, repas du jour, liaison par code, historique. */
export function EcranEnfants() {
  const { state } = useAuth();
  const [enfants, setEnfants] = useState<Enfant[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [rafraichit, setRafraichit] = useState(false);

  const [ajout, setAjout] = useState(false);
  const [code, setCode] = useState('');
  const [lienEnCours, setLienEnCours] = useState(false);
  const [erreurLien, setErreurLien] = useState('');

  const [historique, setHistorique] = useState<{ enfant: Enfant; lignes: Transaction[] | null } | null>(null);

  const charger = useCallback(async () => {
    try {
      setEnfants(await cantineApi.enfants());
      setErreur('');
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger vos enfants.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const lier = async () => {
    setLienEnCours(true);
    setErreurLien('');
    try {
      await cantineApi.lierEnfant(code.trim());
      setAjout(false);
      setCode('');
      await charger();
    } catch (e) {
      setErreurLien(getApiErrorMessage(e, 'Liaison impossible.'));
    } finally {
      setLienEnCours(false);
    }
  };

  const ouvrirHistorique = async (enfant: Enfant) => {
    setHistorique({ enfant, lignes: null });
    try {
      const lignes = await cantineApi.transactionsEnfant(enfant.id);
      setHistorique({ enfant, lignes });
    } catch {
      setHistorique({ enfant, lignes: [] });
    }
  };

  const bas = enfants?.filter((e) => e.soldeBas) ?? [];

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
        <Text style={styles.bonjour}>Bonjour {state.user?.firstName ?? ''} 👋</Text>
        <Text style={styles.titre}>Mes enfants</Text>

        {bas.map((e) => (
          <View key={e.id} style={styles.alerteBas} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <Text style={styles.alerteBasTexte}>
              Il reste {fcfa(e.solde)} à {e.prenom ?? e.nom}, sous votre seuil de {fcfa(e.seuilAlerte)}.
            </Text>
          </View>
        ))}

        {erreur ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={28} color={Colors.primary} />}
            title="Chargement impossible"
            subtitle={erreur}
            buttonLabel="Réessayer"
            onPress={charger}
          />
        ) : !enfants ? (
          <ListeSkeleton lignes={2} />
        ) : enfants.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="people-outline" size={28} color={Colors.primary} />}
            title="Aucun enfant lié"
            subtitle="Demandez à votre enfant son code de liaison (dans son profil) et saisissez-le ici."
            buttonLabel="Ajouter un enfant"
            onPress={() => setAjout(true)}
          />
        ) : (
          enfants.map((e) => (
            <View key={e.id} style={styles.carte}>
              <View style={styles.entete}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexte}>{(e.prenom ?? e.nom).slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom}>{e.nom}</Text>
                  <Text style={styles.classe}>{e.classe ?? '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.soldeLibelle}>Solde</Text>
                  <Text style={[styles.solde, e.soldeBas && { color: Colors.warning }]}>{fcfa(e.solde)}</Text>
                </View>
              </View>

              {e.allergenes.length > 0 && (
                <View style={styles.allergies}>
                  <Ionicons name="alert-circle" size={15} color={Colors.error} />
                  <Text style={styles.allergiesTexte}>
                    Allergie : {e.allergenes.map((a) => a.nom.toLowerCase()).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.repas}>
                {e.repasDuJour ? (
                  <>
                    <Text style={styles.repasTitre}>
                      {e.repasDuJour.statut === 'SERVIE'
                        ? `Aujourd’hui, ${e.prenom ?? e.nom} a mangé :`
                        : `Aujourd’hui, ${e.prenom ?? e.nom} mangera :`}
                    </Text>
                    <Text style={styles.repasPlat}>{e.repasDuJour.plat}</Text>
                    <Text style={styles.repasInfo}>
                      {e.repasDuJour.creneau.replace(/:/g, 'h')}
                      {e.repasDuJour.statut === 'SERVIE' && e.allergenes.length > 0 && e.repasDuJour.allergieVerifiee
                        ? ' · allergie vérifiée au comptoir'
                        : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.repasVide}>Pas de repas réservé aujourd’hui.</Text>
                )}
              </View>

              <View style={styles.actions}>
                <Button
                  label="Recharger"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => router.push({ pathname: '/(parent)/(tabs)/recharge', params: { enfantId: e.id } })}
                />
                <Button label="Historique" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => ouvrirHistorique(e)} />
              </View>
            </View>
          ))
        )}

        {enfants && enfants.length > 0 && (
          <Button label="Ajouter un enfant (code de liaison)" variant="ghost" onPress={() => setAjout(true)} style={{ marginTop: 6 }} />
        )}
      </ScrollView>

      <BottomSheetModal
        visible={ajout}
        onClose={() => setAjout(false)}
        title="Ajouter un enfant"
        footer={<Button label="Lier cet enfant" loading={lienEnCours} disabled={!code.trim()} onPress={lier} />}
      >
        <Text style={styles.aide}>
          Votre enfant trouve son code dans son profil, sous « Code de liaison » (exemple : KOF-4821).
        </Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ABC-1234"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.champ}
        />
        {erreurLien ? <Text style={styles.erreurLien}>{erreurLien}</Text> : null}
      </BottomSheetModal>

      <BottomSheetModal
        visible={!!historique}
        onClose={() => setHistorique(null)}
        title={historique ? `Historique de ${historique.enfant.prenom ?? historique.enfant.nom}` : ''}
      >
        {!historique?.lignes ? (
          <Text style={styles.aide}>Chargement…</Text>
        ) : historique.lignes.length === 0 ? (
          <Text style={styles.aide}>Aucune opération pour l’instant.</Text>
        ) : (
          historique.lignes.map((t) => (
            <View key={t.id} style={styles.ligne}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ligneLibelle} numberOfLines={1}>
                  {t.libelle}
                </Text>
                <Text style={styles.ligneDate}>
                  {jour(t.creeLe)}
                  {t.statut !== 'REUSSIE' ? ` · ${t.statut === 'EN_ATTENTE' ? 'en attente' : 'échouée'}` : ''}
                </Text>
              </View>
              <Text style={[styles.ligneMontant, t.montant > 0 ? styles.plus : styles.moins, t.statut !== 'REUSSIE' && { opacity: 0.45 }]}>
                {t.montant > 0 ? '+' : ''}
                {fcfa(t.montant)}
              </Text>
            </View>
          ))
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 32 },
  bonjour: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 16 },
  alerteBas: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warningBorder, borderRadius: 14, padding: 14, marginBottom: 12 },
  alerteBasTexte: { flex: 1, color: Colors.warning, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  carte: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 14, gap: 12 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { fontSize: 18, fontWeight: '800', color: Colors.primaryDark },
  nom: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  classe: { fontSize: 13, color: Colors.textSecondary },
  soldeLibelle: { fontSize: 11, color: Colors.textSecondary },
  solde: { fontSize: 18, fontWeight: '800', color: Colors.primaryDark },
  allergies: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: Colors.errorLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start' },
  allergiesTexte: { fontSize: 12, color: Colors.error, fontWeight: '600' },
  repas: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12 },
  repasTitre: { fontSize: 12, color: Colors.textSecondary },
  repasPlat: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  repasInfo: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  repasVide: { fontSize: 13, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: 10 },
  aide: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 12 },
  champ: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, fontSize: 20, fontWeight: '800', letterSpacing: 2, color: Colors.textPrimary, marginBottom: 8 },
  erreurLien: { color: Colors.error, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  ligneLibelle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  ligneDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ligneMontant: { fontSize: 14, fontWeight: '800' },
  plus: { color: Colors.success },
  moins: { color: Colors.textMuted },
});
