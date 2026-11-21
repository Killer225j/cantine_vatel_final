import { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import { PhotoPlat } from '../../components/ui/PhotoPlat';
import { ListeSkeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import {
  aujourdhui,
  cantineApi,
  Categorie,
  fcfa,
  ItemMenu,
  JourMenu,
  Portefeuille,
  Semaine,
} from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../auth/useAuth';
import { SoldeSheet, OngletSolde } from '../portefeuille/SoldeSheet';
import { ReserverSheet } from './ReserverSheet';

const ORDRE: Categorie[] = ['ENTREE', 'PLAT', 'DESSERT', 'BOISSON'];
const TITRE_CATEGORIE: Record<Categorie, string> = {
  ENTREE: 'Entrées',
  PLAT: 'Plats',
  DESSERT: 'Desserts',
  BOISSON: 'Boissons',
};

const jourCourt = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

/** Menu de la semaine de l'élève : plats du jour, allergies signalées, réservation. */
export function EcranMenu() {
  const { state } = useAuth();
  const prenom = state.user?.firstName ?? '';

  const [semaine, setSemaine] = useState<Semaine | null>(null);
  const [portefeuille, setPortefeuille] = useState<Portefeuille | null>(null);
  const [jour, setJour] = useState<string>(aujourdhui());
  const choixManuel = useRef(false);
  const ruban = useRef<ComponentRef<typeof ScrollView>>(null);
  const [erreur, setErreur] = useState('');
  const [rafraichit, setRafraichit] = useState(false);
  const [choisi, setChoisi] = useState<ItemMenu | null>(null);
  const [solde, setSolde] = useState<{ ouvert: boolean; onglet: OngletSolde }>({ ouvert: false, onglet: 'recharger' });

  const charger = useCallback(async () => {
    try {
      const aujour = aujourdhui();
      // Les 5 jours avant et après aujourd'hui, en un seul appel.
      const [s, p] = await Promise.all([cantineApi.autour(5, 5), cantineApi.portefeuille()]);
      const jours = s.jours;

      setSemaine(s);
      setPortefeuille(p);
      setErreur('');
      // Le jour affiché : aujourd'hui (même sans menu : on le dit), sinon le prochain jour du service.
      setJour((actuel) => {
        if (choixManuel.current && jours.some((j) => j.date === actuel)) return actuel;
        return (
          jours.find((j) => j.date === aujour)?.date ??
          jours.find((j) => j.date >= aujour)?.date ??
          jours[jours.length - 1]?.date ??
          actuel
        );
      });
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger le menu.'));
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const rafraichir = async () => {
    setRafraichit(true);
    await charger();
    setRafraichit(false);
  };

  const jourCourant: JourMenu | undefined = semaine?.jours.find((j) => j.date === jour);
  const groupes = useMemo(
    () =>
      ORDRE.map((c) => ({
        categorie: c,
        items: (jourCourant?.items ?? []).filter((i) => i.plat.categorie === c),
      })).filter((g) => g.items.length),
    [jourCourant],
  );
  const offres = (jourCourant?.items ?? []).filter(
    (i) => !!i.prixAntiGaspi && !!i.antiGaspiJusqua && new Date(i.antiGaspiJusqua) > new Date(),
  );
  const jusquaOffre = offres.map((i) => i.antiGaspiJusqua as string).sort().pop();
  // Le ruban des jours se cale sur le jour affiché (environ 80 px par pastille).
  useEffect(() => {
    const i = semaine?.jours.findIndex((j) => j.date === jour) ?? -1;
    if (i >= 0) setTimeout(() => ruban.current?.scrollTo({ x: Math.max(0, i * 80 - 120), animated: true }), 50);
  }, [jour, semaine]);

  const jourSuivant = semaine?.jours.find((j) => j.date > jour);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={rafraichir} tintColor={Colors.primary} />}
      >
        <Text style={styles.bonjour}>Bonjour {prenom} 👋</Text>
        <Text style={styles.titre}>Menu de la semaine</Text>

        {/* Solde et rappel d'allergie */}
        <View style={styles.bandeau}>
          <View style={styles.soldeLigne}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bandeauLibelle}>Mon solde</Text>
              <Text style={[styles.solde, portefeuille?.soldeBas && { color: Colors.warning }]}>
                {portefeuille ? fcfa(portefeuille.solde) : '—'}
              </Text>
              {portefeuille?.soldeBas && <Text style={styles.soldeBas}>Solde bas : pensez à recharger</Text>}
            </View>
            <TouchableOpacity
              onPress={() => setSolde({ ouvert: true, onglet: 'historique' })}
              style={styles.boutonSolde}
              accessibilityRole="button"
              accessibilityLabel="Historique du solde"
            >
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSolde({ ouvert: true, onglet: 'recharger' })}
              style={[styles.boutonSolde, styles.boutonSoldePlus]}
              accessibilityRole="button"
              accessibilityLabel="Recharger mon solde"
            >
              <Ionicons name="add" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {semaine && semaine.allergies.length > 0 && (
            <View style={styles.allergie}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.allergieTexte}>
                Allergie : {semaine.allergies.map((a) => a.nom.toLowerCase()).join(', ')}
              </Text>
            </View>
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
        ) : !semaine ? (
          <ListeSkeleton lignes={4} />
        ) : (
          <>
            <ScrollView ref={ruban} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jours}>
              {semaine.jours.map((j) => {
                const actif = j.date === jour;
                return (
                  <TouchableOpacity
                    key={j.date}
                    onPress={() => {
                      choixManuel.current = true;
                      setJour(j.date);
                    }}
                    style={[styles.jourPuce, actif && styles.jourPuceActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                  >
                    <Text style={[styles.jourTexte, actif && styles.jourTexteActif]}>{jourCourt(j.date)}</Text>
                    {j.date === aujourdhui() && <View style={[styles.point, actif && { backgroundColor: Colors.white }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {offres.length > 0 && (
              <View style={styles.offre} accessibilityRole="alert">
                <Ionicons name="leaf" size={20} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offreTitre}>Offre de fin de service</Text>
                  <Text style={styles.offreTexte}>
                    {offres.length} plat{offres.length > 1 ? 's' : ''} à prix réduit jusqu’à{' '}
                    {jusquaOffre ? new Date(jusquaOffre).toISOString().slice(11, 16).replace(':', 'h') : ''}. Touchez un plat pour le réserver.
                  </Text>
                </View>
              </View>
            )}

            {!jourCourant?.publie || !jourCourant.items.length ? (
              <EmptyState
                icon={<Ionicons name="time-outline" size={28} color={Colors.primary} />}
                title="Menu pas encore publié"
                subtitle="Le menu de ce jour sera visible dès sa publication par la cuisine."
                buttonLabel={jourSuivant ? `Voir le ${jourCourt(jourSuivant.date)}` : undefined}
                onPress={
                  jourSuivant
                    ? () => {
                        choixManuel.current = true;
                        setJour(jourSuivant.date);
                      }
                    : undefined
                }
              />
            ) : (
              groupes.map((g) => (
                <View key={g.categorie} style={{ marginBottom: 8 }}>
                  <Text style={styles.section}>{TITRE_CATEGORIE[g.categorie]}</Text>
                  {g.items.map((i) => (
                    <CartePlat key={i.id} item={i} onPress={() => setChoisi(i)} />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <SoldeSheet
        visible={solde.ouvert}
        onglet={solde.onglet}
        solde={portefeuille?.solde ?? null}
        onClose={() => setSolde((a) => ({ ...a, ouvert: false }))}
        onRecharge={charger}
      />

      <ReserverSheet
        item={choisi}
        date={jour}
        portefeuille={portefeuille}
        onClose={() => setChoisi(null)}
        onReserve={charger}
        onRecharger={() => setSolde({ ouvert: true, onglet: 'recharger' })}
      />
    </SafeAreaView>
  );
}

function CartePlat({ item, onPress }: { item: ItemMenu; onPress: () => void }) {
  const p = item.plat;
  const enOffre = !!item.prixAntiGaspi && !!item.antiGaspiJusqua && new Date(item.antiGaspiJusqua) > new Date();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.carte, item.incompatible && styles.carteIncompatible]}
      accessibilityRole="button"
      accessibilityLabel={`${p.nom}, ${fcfa(p.prix)}${item.incompatible ? ', déconseillé pour vous' : ''}`}
    >
      <PhotoPlat uri={p.photoUrl} nom={p.nom} taille={76} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.carteNom, item.incompatible && styles.barre]} numberOfLines={1}>
          {p.nom}
        </Text>
        {p.description ? (
          <Text style={styles.carteDescription} numberOfLines={2}>
            {p.description}
          </Text>
        ) : null}
        <View style={styles.carteBas}>
          {enOffre ? (
            <>
              <Text style={styles.cartePrix}>{fcfa(item.prixAntiGaspi as number)}</Text>
              <Text style={styles.prixBarre}>{fcfa(p.prix)}</Text>
              <View style={styles.badgeOffre}>
                <Text style={styles.badgeOffreTexte}>
                  −{Math.round((1 - (item.prixAntiGaspi as number) / p.prix) * 100)} %
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.cartePrix}>{fcfa(p.prix)}</Text>
          )}
          {p.noteMoyenne !== null && (
            <Text style={styles.carteNote}>
              ★ {p.noteMoyenne} <Text style={{ color: Colors.textTertiary }}>({p.nbAvis})</Text>
            </Text>
          )}
        </View>
        {item.incompatible ? (
          <Text style={styles.carteAlerte}>
            Contient : {item.conflits.map((c) => c.nom.toLowerCase()).join(', ')} — déconseillé pour vous
          </Text>
        ) : p.allergenes.length ? (
          <Text style={styles.carteAllergenes} numberOfLines={1}>
            {p.allergenes.map((a) => a.nom).join(' · ')}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 32 },
  bonjour: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  titre: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 16 },
  bandeau: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  soldeLigne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boutonSolde: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primaryBorder, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  boutonSoldePlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark, borderBottomWidth: 3, shadowColor: '#0d3a5c', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  bandeauLibelle: { fontSize: 12, color: Colors.textSecondary },
  solde: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark },
  soldeBas: { fontSize: 12, color: Colors.warning, fontWeight: '600', marginTop: 2 },
  allergie: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  allergieTexte: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  jours: { gap: 8, paddingBottom: 14 },
  jourPuce: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jourPuceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  jourTexte: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  jourTexteActif: { color: Colors.white },
  point: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  section: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: 10 },
  carte: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  offre: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.successBorder, borderRadius: 14, padding: 14, marginBottom: 12 },
  offreTitre: { fontSize: 14, fontWeight: '800', color: Colors.success },
  offreTexte: { fontSize: 13, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
  prixBarre: { fontSize: 12, color: Colors.textTertiary, textDecorationLine: 'line-through' },
  badgeOffre: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeOffreTexte: { fontSize: 11, fontWeight: '800', color: Colors.success },
  carteIncompatible: { borderColor: Colors.errorBorder, backgroundColor: Colors.errorLight },
  carteNom: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  barre: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  carteDescription: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  carteBas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, marginTop: 6 },
  cartePrix: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  carteNote: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  carteAlerte: { fontSize: 12, color: Colors.error, fontWeight: '700', marginTop: 6 },
  carteAllergenes: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
});
