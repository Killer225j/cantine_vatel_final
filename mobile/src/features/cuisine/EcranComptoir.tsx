import { formaterCodeReservation } from '../../utils/codes';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { cantineApi, Commandes, heure, raisonErreur, Reservation } from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';

const TITRES_REFUS: Record<string, string> = {
  DEJA_SERVIE: 'Code déjà utilisé : ne pas servir',
  CODE_INCONNU: 'Code introuvable',
  PAS_AUJOURDHUI: 'Ce repas n’est pas pour aujourd’hui',
  RESERVATION_ANNULEE: 'Réservation annulée : ne pas servir',
};

interface Refus {
  titre: string;
  message: string;
}

/** Comptoir : scan du QR (caméra) ou saisie du code, alerte allergie, service. */
export function EcranComptoir() {
  const [permission, demanderPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [resultat, setResultat] = useState<Reservation | null>(null);
  const [refus, setRefus] = useState<Refus | null>(null);
  const [servie, setServie] = useState(false);
  const [controle1, setControle1] = useState(false);
  const [controle2, setControle2] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [stats, setStats] = useState<Commandes | null>(null);
  // Verrou : la caméra lit le même QR plusieurs fois par seconde, un seul traitement à la fois.
  const verrou = useRef(false);

  const actualiser = useCallback(async () => {
    try {
      setStats(await cantineApi.commandes());
    } catch {
      /* les compteurs sont un confort : le scan reste utilisable */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      actualiser();
    }, [actualiser]),
  );

  const suivant = () => {
    setCode('');
    setResultat(null);
    setRefus(null);
    setServie(false);
    setControle1(false);
    setControle2(false);
    verrou.current = false;
  };

  const verifier = async (valeur: string) => {
    const brut = valeur.trim();
    if (!brut || verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    setRefus(null);
    setResultat(null);
    setServie(false);
    setControle1(false);
    setControle2(false);
    try {
      setResultat(await cantineApi.scanner(brut));
    } catch (e) {
      setRefus({
        titre: TITRES_REFUS[raisonErreur(e)] ?? 'Code refusé',
        message: getApiErrorMessage(e, 'Vérification impossible.'),
      });
    } finally {
      setEnCours(false);
    }
  };

  const servir = async (r: Reservation) => {
    setEnCours(true);
    try {
      await cantineApi.servir(r.id, r.alertesAllergie.length > 0);
      setServie(true);
      actualiser();
    } catch (e) {
      setRefus({ titre: 'Service impossible', message: getApiErrorMessage(e, 'Le repas n’a pas pu être marqué servi.') });
      setResultat(null);
    } finally {
      setEnCours(false);
    }
  };

  const risque = !!resultat && resultat.alertesAllergie.length > 0;
  const peutServir = !!resultat && (!risque || (controle1 && controle2));
  const occupe = !!resultat || !!refus;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.surtitre}>Cuisine</Text>
        <Text style={styles.titre}>Comptoir</Text>

        <View style={styles.compteurs}>
          <Compteur valeur={stats?.compteurs.servies} libelle="Servis" couleur={Colors.success} />
          <Compteur valeur={stats?.compteurs.aServir} libelle="Restants" couleur={Colors.primary} />
          <Compteur valeur={stats?.compteurs.aRisqueAllergique} libelle="À risque" couleur={Colors.error} />
        </View>

        {/* Viseur */}
        {!occupe && (
          <View style={styles.viseurBoite}>
            {permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => verifier(data)}
              />
            ) : (
              <View style={styles.viseurVide}>
                <Ionicons name="camera-outline" size={34} color={Colors.primaryBorder} />
                <Text style={styles.viseurTexte}>
                  {permission && !permission.canAskAgain
                    ? 'Caméra refusée : saisissez le code à la main.'
                    : 'Autorisez la caméra pour scanner les QR codes.'}
                </Text>
                {permission?.canAskAgain !== false && (
                  <Button label="Autoriser la caméra" size="sm" onPress={demanderPermission} />
                )}
              </View>
            )}
            <View pointerEvents="none" style={styles.cadre} />
          </View>
        )}

        {/* Saisie manuelle */}
        {!occupe && (
          <View style={styles.saisie}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode((avant) => formaterCodeReservation(t, avant))}
              placeholder="RV-XXXX-XXXX-XXXX"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={() => verifier(code)}
              style={styles.champ}
            />
            <Button label="Valider" onPress={() => verifier(code)} loading={enCours} disabled={!code.trim()} style={{ minWidth: 100 }} />
          </View>
        )}

        {refus && (
          <View style={styles.refus} accessibilityRole="alert">
            <Text style={styles.refusTitre}>
              <Ionicons name="close-circle" size={18} color={Colors.error} /> {refus.titre}
            </Text>
            <Text style={styles.refusTexte}>{refus.message}</Text>
            <Button label="Scan suivant" onPress={suivant} style={{ marginTop: 12 }} />
          </View>
        )}

        {resultat && servie && (
          <View style={styles.ok}>
            <Text style={styles.okTitre}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} /> Servi : {resultat.eleve.nom}
            </Text>
            <Text style={styles.okTexte}>
              {resultat.plat.nom} · {heure(resultat.creneau.heureDebut)}
            </Text>
            <Button label="Scan suivant" onPress={suivant} style={{ marginTop: 12 }} />
          </View>
        )}

        {resultat && !servie && (
          <View style={[styles.resultat, risque ? styles.resultatRisque : styles.resultatOk]}>
            {risque ? (
              <>
                <Text style={styles.alerteTitre}>
                  ⚠ ALLERGIE : {resultat.alertesAllergie.map((a) => a.nom.toUpperCase()).join(', ')}
                </Text>
                <Text style={styles.alerteTexte}>Ce plat contient un allergène déclaré par l’élève. Contrôlez avant de servir.</Text>
              </>
            ) : (
              <Text style={styles.validTitre}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} /> Réservation valide
              </Text>
            )}

            <View style={styles.eleve}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexte}>{resultat.eleve.initiales}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eleveNom}>{resultat.eleve.nom}</Text>
                <Text style={styles.eleveInfo}>
                  {resultat.eleve.classe ?? '—'} · {resultat.plat.nom} · {heure(resultat.creneau.heureDebut)}
                </Text>
              </View>
            </View>

            {risque && (
              <>
                <Case coche={controle1} onPress={() => setControle1(!controle1)} texte="J’ai vérifié que le plat servi ne contient pas l’allergène." />
                <Case coche={controle2} onPress={() => setControle2(!controle2)} texte="J’ai prévenu l’élève ou son parent." />
              </>
            )}

            <Button label="Marquer servie" onPress={() => servir(resultat)} loading={enCours} disabled={!peutServir} style={{ marginTop: 6 }} />
            <Button label="Refuser le service" variant="outline" onPress={suivant} style={{ marginTop: 8 }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Compteur({ valeur, libelle, couleur }: { valeur: number | undefined; libelle: string; couleur: string }) {
  return (
    <View style={styles.compteur}>
      <Text style={[styles.compteurValeur, { color: couleur }]}>{valeur ?? '—'}</Text>
      <Text style={styles.compteurLibelle}>{libelle}</Text>
    </View>
  );
}

function Case({ coche, onPress, texte }: { coche: boolean; onPress: () => void; texte: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.caseLigne} accessibilityRole="checkbox" accessibilityState={{ checked: coche }}>
      <Ionicons name={coche ? 'checkbox' : 'square-outline'} size={24} color={coche ? Colors.primary : Colors.textTertiary} />
      <Text style={styles.caseTexte}>{texte}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 32 },
  surtitre: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 14 },
  compteurs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  compteur: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, alignItems: 'center' },
  compteurValeur: { fontSize: 24, fontWeight: '800' },
  compteurLibelle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  viseurBoite: { height: 260, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.primaryDark, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  viseurVide: { alignItems: 'center', gap: 10, padding: 24 },
  viseurTexte: { color: Colors.primaryLight, textAlign: 'center', fontSize: 14 },
  cadre: { position: 'absolute', width: 190, height: 190, borderRadius: 18, borderWidth: 3, borderColor: Colors.primaryBorder },
  saisie: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  champ: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 14, fontSize: 16, fontWeight: '700', letterSpacing: 1, color: Colors.textPrimary },
  refus: { backgroundColor: Colors.errorLight, borderWidth: 2, borderColor: Colors.error, borderRadius: 16, padding: 16 },
  refusTitre: { fontSize: 17, fontWeight: '800', color: Colors.error },
  refusTexte: { fontSize: 14, color: Colors.textMuted, marginTop: 6, lineHeight: 20 },
  ok: { backgroundColor: Colors.successLight, borderWidth: 2, borderColor: Colors.success, borderRadius: 16, padding: 16 },
  okTitre: { fontSize: 18, fontWeight: '800', color: Colors.success },
  okTexte: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  resultat: { borderRadius: 16, padding: 16, borderWidth: 2, gap: 10 },
  resultatRisque: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  resultatOk: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  alerteTitre: { fontSize: 20, fontWeight: '900', color: Colors.error },
  alerteTexte: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  validTitre: { fontSize: 18, fontWeight: '800', color: Colors.success },
  eleve: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 12, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { fontWeight: '800', color: Colors.primaryDark },
  eleveNom: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  eleveInfo: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  caseLigne: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  caseTexte: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
});
