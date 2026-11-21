import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListeSkeleton } from '../../components/ui/Skeleton';
import { NoterSheet } from './NoterSheet';
import { Colors } from '../../constants/colors';
import {
  aujourdhui,
  cantineApi,
  fcfa,
  heure,
  MesReservations,
  Reservation,
  StatutReservation,
} from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';

const STATUT: Record<StatutReservation, { libelle: string; ton: BadgeTone }> = {
  CONFIRMEE: { libelle: 'Confirmée', ton: 'info' },
  SERVIE: { libelle: 'Servie', ton: 'succes' },
  ABSENT: { libelle: 'Absent', ton: 'attention' },
  ANNULEE: { libelle: 'Annulée', ton: 'neutre' },
};

const jourLong = (date: string) =>
  new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/** Réservations de l'élève : QR code du repas à venir (hors ligne), annulation, historique. */
export function EcranReservations() {
  const [donnees, setDonnees] = useState<MesReservations | null>(null);
  const [erreur, setErreur] = useState('');
  const [rafraichit, setRafraichit] = useState(false);
  const [aAnnuler, setAAnnuler] = useState<Reservation | null>(null);
  const [annulation, setAnnulation] = useState(false);
  const [messageAnnulation, setMessageAnnulation] = useState('');
  const [aNoter, setANoter] = useState<Reservation | null>(null);

  const charger = useCallback(async () => {
    try {
      setDonnees(await cantineApi.mesReservations());
      setErreur('');
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger vos réservations.'));
    }
  }, []);

  // Recharge à chaque retour sur l'onglet (après une réservation, par exemple).
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const rafraichir = async () => {
    setRafraichit(true);
    await charger();
    setRafraichit(false);
  };

  const confirmerAnnulation = async () => {
    if (!aAnnuler) return;
    setAnnulation(true);
    try {
      await cantineApi.annuler(aAnnuler.id);
      setMessageAnnulation(`${fcfa(aAnnuler.prix)} remboursés sur votre solde.`);
      setAAnnuler(null);
      await charger();
    } catch (e) {
      setMessageAnnulation('');
      setErreur(getApiErrorMessage(e, 'Annulation impossible.'));
      setAAnnuler(null);
    } finally {
      setAnnulation(false);
    }
  };

  const prochaine = donnees?.aVenir.find((r) => r.statut === 'CONFIRMEE') ?? null;
  // Annulation possible jusqu'à 10h (heure d'Abidjan = UTC) le jour du repas.
  const annulable =
    !!prochaine && (prochaine.date.slice(0, 10) > aujourdhui() || new Date().getUTCHours() < 10);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={rafraichir} tintColor={Colors.primary} />}
      >
        <Text style={styles.surtitre}>Élève</Text>
        <Text style={styles.titre}>Mes réservations</Text>

        {messageAnnulation ? (
          <View style={styles.rembourse}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.rembourseTexte}>Réservation annulée. {messageAnnulation}</Text>
          </View>
        ) : null}

        {erreur ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={28} color={Colors.primary} />}
            title="Chargement impossible"
            subtitle={erreur}
            buttonLabel="Réessayer"
            onPress={charger}
          />
        ) : !donnees ? (
          <ListeSkeleton lignes={2} />
        ) : (
          <>
            {prochaine ? (
              <View style={styles.carteQr}>
                <View style={styles.qrTete}>
                  <Badge label={prochaine.date.slice(0, 10) === aujourdhui() ? 'Aujourd’hui' : jourLong(prochaine.date)} tone="info" />
                  <Badge label={STATUT[prochaine.statut].libelle} tone={STATUT[prochaine.statut].ton} />
                </View>
                <View style={styles.qrBoite}>
                  <QRCode value={prochaine.code} size={190} color={Colors.primaryDark} backgroundColor={Colors.white} />
                </View>
                <Text style={styles.code} selectable>
                  {prochaine.code}
                </Text>
                <Text style={styles.horsLigne}>Disponible hors ligne · à présenter au comptoir</Text>
                <View style={styles.detail}>
                  <Text style={styles.detailPlat}>{prochaine.plat.nom}</Text>
                  <Text style={styles.detailInfo}>
                    Créneau {heure(prochaine.creneau.heureDebut)} – {heure(prochaine.creneau.heureFin)} · {fcfa(prochaine.prix)}
                  </Text>
                </View>
                {prochaine.alertesAllergie.length > 0 && (
                  <View style={styles.allergie}>
                    <Ionicons name="warning" size={16} color={Colors.error} />
                    <Text style={styles.allergieTexte}>
                      Ce plat contient : {prochaine.alertesAllergie.map((a) => a.nom.toLowerCase()).join(', ')}. Le comptoir contrôlera avant de vous servir.
                    </Text>
                  </View>
                )}
                {annulable && (
                  <Button label="Annuler la réservation" variant="danger" size="md" onPress={() => setAAnnuler(prochaine)} />
                )}
                <Text style={styles.regle}>
                  {annulable ? 'Annulation gratuite jusqu’à 10h le jour même.' : 'Annulation impossible après 10h : présentez ce QR code au comptoir.'}
                </Text>
              </View>
            ) : (
              <EmptyState
                icon={<Ionicons name="qr-code-outline" size={28} color={Colors.primary} />}
                title="Aucun repas réservé"
                subtitle="Choisissez votre plat et votre créneau pour éviter la file."
                buttonLabel="Voir le menu du jour"
                onPress={() => router.push('/(eleve)/(tabs)')}
              />
            )}

            <Text style={styles.section}>Historique</Text>
            {donnees.historique.length === 0 ? (
              <Text style={styles.vide}>Vos repas passés apparaîtront ici.</Text>
            ) : (
              donnees.historique.map((r) => (
                <View key={r.id} style={styles.ligne}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lignePlat} numberOfLines={1}>
                      {r.plat.nom}
                    </Text>
                    <Text style={styles.ligneDate}>
                      {jourLong(r.date)} · {fcfa(r.prix)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Badge label={STATUT[r.statut].libelle} tone={STATUT[r.statut].ton} />
                    {r.statut === 'SERVIE' &&
                      (r.note ? (
                        <Text style={styles.noteDonnee}>★ {r.note}</Text>
                      ) : (
                        <TouchableOpacity onPress={() => setANoter(r)} accessibilityRole="button" accessibilityLabel={`Noter ${r.plat.nom}`}>
                          <Text style={styles.noter}>Noter ce repas</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <NoterSheet reservation={aNoter} onClose={() => setANoter(null)} onNote={charger} />

      <ConfirmModal
        visible={!!aAnnuler}
        title="Annuler cette réservation ?"
        message={aAnnuler ? `${aAnnuler.plat.nom} sera annulé et ${fcfa(aAnnuler.prix)} vous seront remboursés.` : ''}
        confirmLabel="Oui, annuler"
        cancelLabel="Garder"
        danger
        loading={annulation}
        onConfirm={confirmerAnnulation}
        onCancel={() => setAAnnuler(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 32 },
  surtitre: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 16 },
  rembourse: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  rembourseTexte: { flex: 1, color: Colors.success, fontWeight: '600', fontSize: 13 },
  carteQr: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'stretch',
  },
  qrTete: { flexDirection: 'row', justifyContent: 'space-between' },
  qrBoite: { alignSelf: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.white },
  code: { textAlign: 'center', fontSize: 18, fontWeight: '800', letterSpacing: 1.2, color: Colors.primaryDark },
  horsLigne: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary },
  detail: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12 },
  detailPlat: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  detailInfo: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  allergie: { flexDirection: 'row', gap: 8, backgroundColor: Colors.errorLight, borderRadius: 12, padding: 12 },
  allergieTexte: { flex: 1, color: Colors.error, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  regle: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary },
  section: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10 },
  noter: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  noteDonnee: { fontSize: 13, fontWeight: '800', color: '#b45309' },
  vide: { fontSize: 13, color: Colors.textSecondary },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  lignePlat: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  ligneDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
});
