import { ReactNode, useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Allergene, cantineApi, Commandes, Enfant, fcfa, Moyen, ProfilEleve } from '../../api/cantine.api';
import { OngletSolde, SoldeSheet } from '../portefeuille/SoldeSheet';
import { ecrirePrefs, lirePrefs, Prefs, PREFS_PAR_DEFAUT } from '../../utils/prefs';
import { Role } from '../../types/api.types';
import { useAuth } from '../auth/useAuth';

const LIBELLE_ROLE: Record<Role, string> = {
  ELEVE: 'Élève',
  PARENT: 'Parent',
  ADMIN: 'Administration',
  CUISINE: 'Cuisine',
};

/** Adresse de la cantine pour le bouton « Contacter » (à confirmer avec Vatel). */
const CONTACT_CANTINE = 'cantine@vatel.ci';

const MOYENS: { code: Moyen; libelle: string; abrege: string; couleur: string; texte: string }[] = [
  { code: 'WAVE', libelle: 'Wave', abrege: 'wave', couleur: '#1dc8ff', texte: '#ffffff' },
  { code: 'ORANGE_MONEY', libelle: 'Orange Money', abrege: 'OM', couleur: '#ff7900', texte: '#ffffff' },
  { code: 'MTN_MOMO', libelle: 'MTN MoMo', abrege: 'MTN', couleur: '#ffcc00', texte: '#111827' },
  { code: 'MOOV_MONEY', libelle: 'Moov Money', abrege: 'moov', couleur: '#0a6ebd', texte: '#ffffff' },
];

/** « +225 07 08 12 34 56 » → « +225 07 •• •• 34 56 ». */
function masquer(tel: string | null | undefined): string {
  if (!tel) return 'Numéro non renseigné';
  const chiffres = tel.replace(/\D/g, '');
  if (chiffres.length < 10) return tel;
  const fin = chiffres.slice(-10);
  return `+225 ${fin.slice(0, 2)} •• •• ${fin.slice(6, 8)} ${fin.slice(8)}`;
}

/** Profil des trois espaces : identité, blocs propres au rôle, préférences, contact, déconnexion. */
export function EcranProfil() {
  const { state, logout } = useAuth();
  const user = state.user;
  const role = user?.role;
  const nom = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const initiales = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('');

  const [profil, setProfil] = useState<ProfilEleve | null>(null);
  const [tous, setTous] = useState<Allergene[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [service, setService] = useState<Commandes | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(PREFS_PAR_DEFAUT);
  const [solde, setSolde] = useState<{ ouvert: boolean; onglet: OngletSolde }>({ ouvert: false, onglet: 'recharger' });

  const charger = useCallback(() => {
    lirePrefs().then(setPrefs);
    // Les alertes sont enregistrées sur le serveur : elles suivent le compte d'un appareil à l'autre.
    cantineApi.preferencesNotif().then((n) => setPrefs((p) => ({ ...p, ...n }))).catch(() => undefined);
    if (role === 'ELEVE') {
      Promise.all([cantineApi.profilEleve(), cantineApi.allergenes()])
        .then(([p, a]) => {
          setProfil(p);
          setTous(a);
          setMes(p.allergenes.map((x) => x.code));
        })
        .catch(() => setMessage('Impossible de charger votre profil de cantine.'));
    }
    if (role === 'PARENT') cantineApi.enfants().then(setEnfants).catch(() => undefined);
    if (role === 'CUISINE') cantineApi.commandes().then(setService).catch(() => undefined);
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const changerPref = (cle: keyof Prefs, valeur: Prefs[keyof Prefs]) => {
    const suivantes = { ...prefs, [cle]: valeur } as Prefs;
    setPrefs(suivantes);
    ecrirePrefs(suivantes);
    if (cle !== 'moyen') {
      cantineApi.modifierPreferencesNotif({ [cle]: valeur }).catch(() => {
        setPrefs(prefs);
        ecrirePrefs(prefs);
        setMessage('Impossible d’enregistrer ce réglage : réessayez.');
      });
    }
  };

  const basculer = async (code: string) => {
    const avant = mes;
    const apres = mes.includes(code) ? mes.filter((c) => c !== code) : [...mes, code];
    setMes(apres);
    try {
      await cantineApi.definirAllergies(apres);
      setMessage('Allergies enregistrées.');
    } catch {
      setMes(avant);
      setMessage('L’enregistrement a échoué. Réessayez.');
    }
  };

  const seDeconnecter = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const contacter = () => Linking.openURL(`mailto:${CONTACT_CANTINE}?subject=${encodeURIComponent('Cantine Vatel')}`);

  const sousTitre =
    role === 'ELEVE'
      ? ['Élève', profil?.classe].filter(Boolean).join(' · ')
      : role === 'PARENT'
        ? ['Parent', user?.phone].filter(Boolean).join(' · ')
        : role
          ? LIBELLE_ROLE[role]
          : '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identité (la cloche est dans l'enveloppe de l'espace) */}
        <View style={styles.entete}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>{initiales || '?'}</Text>
          </View>
          <View style={{ flex: 1, paddingRight: 52 }}>
            <Text style={styles.nom} numberOfLines={1}>
              {nom}
            </Text>
            <Text style={styles.sousTitre} numberOfLines={1}>
              {sousTitre}
            </Text>
          </View>
        </View>

        {/* ─── Élève ─── */}
        {role === 'ELEVE' && (
          <>
            <View style={styles.solde}>
              <View style={styles.soldeCercle} />
              <View style={styles.soldeHaut}>
                <Text style={styles.soldeLibelle}>Mon solde</Text>
                {profil?.soldeBas && (
                  <View style={styles.badgeBas}>
                    <Text style={styles.badgeBasTexte}>Solde bas</Text>
                  </View>
                )}
              </View>
              <View style={styles.soldeLigne}>
                <Text style={styles.soldeMontant}>{profil ? fcfa(profil.solde) : '—'}</Text>
                <TouchableOpacity onPress={() => setSolde({ ouvert: true, onglet: 'historique' })} style={styles.boutonSolde} accessibilityRole="button" accessibilityLabel="Historique du solde">
                  <Ionicons name="time-outline" size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSolde({ ouvert: true, onglet: 'recharger' })} style={[styles.boutonSolde, styles.boutonPlus]} accessibilityRole="button" accessibilityLabel="Recharger mon solde">
                  <Ionicons name="add" size={24} color="#0d3a5c" />
                </TouchableOpacity>
              </View>
              {profil?.soldeBas && (
                <Text style={styles.soldeInfo}>
                  Sous le seuil de {fcfa(profil.seuilAlerte)}
                  {profil.parents.length ? ` : ${profil.parents.join(' et ')} ${profil.parents.length > 1 ? 'ont' : 'a'} été prévenu${profil.parents.length > 1 ? 's' : 'e'}.` : '.'}
                </Text>
              )}
              <View style={styles.soldeBas}>
                <Text style={styles.soldeLibelle}>Code de liaison parent</Text>
                <Text style={styles.code} selectable>
                  {profil?.codeLiaison ?? '—'}
                </Text>
              </View>
            </View>

            <Carte titre="Mes allergies" aide="Les plats concernés sont signalés en rouge et le comptoir est alerté au scan.">
              <View style={styles.puces}>
                {tous.map((a) => {
                  const coche = mes.includes(a.code);
                  return (
                    <TouchableOpacity key={a.code} onPress={() => basculer(a.code)} style={[styles.puce, coche && styles.puceActive]} accessibilityRole="checkbox" accessibilityState={{ checked: coche }}>
                      <Ionicons name={coche ? 'checkbox' : 'square-outline'} size={18} color={coche ? Colors.error : Colors.textTertiary} />
                      <Text style={[styles.puceTexte, coche && { color: Colors.error, fontWeight: '800' }]}>{a.nom}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </Carte>
          </>
        )}

        {/* ─── Parent ─── */}
        {role === 'PARENT' && (
          <>
            <Carte titre="Enfants liés">
              {enfants.length === 0 ? (
                <Text style={styles.aide}>Aucun enfant lié pour l’instant : ajoutez-en un depuis l’onglet Enfants.</Text>
              ) : (
                enfants.map((e, i) => (
                  <TouchableOpacity key={e.id} onPress={() => router.push('/(parent)/(tabs)')} style={[styles.rangee, i < enfants.length - 1 && styles.separateur]} accessibilityRole="button">
                    <View style={styles.petitAvatar}>
                      <Text style={styles.petitAvatarTexte}>{(e.nom.split(' ').map((m) => m[0]).join('') || '?').slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rangeeTitre}>{e.nom}</Text>
                      <Text style={styles.rangeeSous}>
                        {e.classe ?? '—'} · {fcfa(e.solde)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </Carte>

            <Carte titre="Moyens de paiement" aide="Le moyen par défaut est proposé à chaque recharge.">
              {MOYENS.map((m, i) => (
                <TouchableOpacity key={m.code} onPress={() => changerPref('moyen', m.code)} style={[styles.rangee, i < MOYENS.length - 1 && styles.separateur]} accessibilityRole="radio" accessibilityState={{ selected: prefs.moyen === m.code }}>
                  <View style={[styles.logoMoyen, { backgroundColor: m.couleur }]}>
                    <Text style={[styles.logoMoyenTexte, { color: m.texte }]}>{m.abrege}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rangeeTitre}>{m.libelle}</Text>
                    <Text style={styles.rangeeSous}>{masquer(user?.phone)}</Text>
                  </View>
                  {prefs.moyen === m.code && (
                    <View style={styles.parDefaut}>
                      <Text style={styles.parDefautTexte}>Par défaut</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Carte>

            <Carte titre="Notifications" aide="Enregistrées sur votre compte.">
              <Interrupteur titre="Solde bas" sous="Quand le solde passe sous le seuil" valeur={prefs.alerteSoldeBas} onChange={(v) => changerPref('alerteSoldeBas', v)} separateur />
              <Interrupteur titre="Récap quotidien" sous="Ce que mon enfant a mangé" valeur={prefs.recapQuotidien} onChange={(v) => changerPref('recapQuotidien', v)} separateur />
              <Interrupteur titre="Alerte allergie" sous="Si un plat à risque est réservé" valeur={prefs.alerteAllergie} onChange={(v) => changerPref('alerteAllergie', v)} />
            </Carte>
          </>
        )}

        {/* ─── Cuisine ─── */}
        {role === 'CUISINE' && (
          <>
            <Carte titre="Service du jour">
              <View style={styles.compteurs}>
                <Compteur valeur={service?.compteurs.servies} libelle="Servis" couleur={Colors.success} />
                <Compteur valeur={service?.compteurs.aServir} libelle="Restants" couleur={Colors.primary} />
                <Compteur valeur={service?.compteurs.aRisqueAllergique} libelle="À risque" couleur={Colors.error} />
              </View>
            </Carte>
            <Carte titre="Comptoir">
              <View style={[styles.rangee, styles.separateur]}>
                <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeeTitre}>Comptoir principal</Text>
                  <Text style={styles.rangeeSous}>Scan du QR code ou saisie du code</Text>
                </View>
              </View>
              <View style={styles.rangee}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeeTitre}>Contrôle allergie obligatoire</Text>
                  <Text style={styles.rangeeSous}>Deux vérifications avant de servir un plat à risque</Text>
                </View>
              </View>
            </Carte>
          </>
        )}

        {/* ─── Informations ─── */}
        <Carte titre="Mes informations">
          <View style={[styles.rangee, styles.separateur]}>
            <Text style={[styles.rangeeSous, { width: 80 }]}>Email</Text>
            <Text style={styles.valeur} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.rangee}>
            <Text style={[styles.rangeeSous, { width: 80 }]}>Téléphone</Text>
            <Text style={styles.valeur}>{user?.phone ?? 'Non renseigné'}</Text>
          </View>
        </Carte>

        {/* ─── Contact et déconnexion ─── */}
        <View style={styles.carte}>
          <View style={[styles.rangee, styles.separateur]} accessibilityLabel="Langue : français. L'anglais sera bientôt disponible.">
            <Ionicons name="language-outline" size={20} color={Colors.primary} />
            <Text style={[styles.rangeeTitre, { flex: 1 }]}>Langue</Text>
            <View style={styles.langues}>
              <View style={styles.langueActive}>
                <Text style={styles.langueActiveTexte}>FR</Text>
              </View>
              <View style={styles.langueBientot}>
                <Text style={styles.langueBientotTexte}>EN · bientôt</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={contacter} style={[styles.rangee, styles.separateur]} accessibilityRole="button">
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            <Text style={[styles.rangeeTitre, { flex: 1 }]}>Contacter la cantine</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={seDeconnecter} style={styles.rangee} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={[styles.rangeeTitre, { flex: 1, color: Colors.error }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pied}>Cantine Vatel v{version} · Vatel Abidjan</Text>
      </ScrollView>

      <SoldeSheet
        visible={solde.ouvert}
        onglet={solde.onglet}
        solde={profil?.solde ?? null}
        onClose={() => setSolde((a) => ({ ...a, ouvert: false }))}
        onRecharge={charger}
      />
    </SafeAreaView>
  );
}

function Carte({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <View style={styles.carte}>
      <Text style={styles.carteTitre}>{titre}</Text>
      {aide ? <Text style={styles.aide}>{aide}</Text> : null}
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Interrupteur({ titre, sous, valeur, onChange, separateur }: { titre: string; sous: string; valeur: boolean; onChange: (v: boolean) => void; separateur?: boolean }) {
  return (
    <View style={[styles.rangee, separateur && styles.separateur]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rangeeTitre}>{titre}</Text>
        <Text style={styles.rangeeSous}>{sous}</Text>
      </View>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.white} accessibilityLabel={titre} />
    </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },

  entete: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { color: Colors.white, fontSize: 21, fontWeight: '800' },
  nom: { fontSize: 21, fontWeight: '800', color: Colors.textPrimary },
  sousTitre: { fontSize: 13, color: Colors.primary, marginTop: 1, fontWeight: '600' },

  solde: { backgroundColor: '#0d3a5c', borderRadius: 22, padding: 18, overflow: 'hidden' },
  soldeCercle: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(135,193,235,0.18)' },
  soldeHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soldeLibelle: { fontSize: 12, color: Colors.primaryBorder, fontWeight: '600' },
  badgeBas: { backgroundColor: '#fde68a', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeBasTexte: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  soldeLigne: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  soldeMontant: { flex: 1, fontSize: 32, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  boutonSolde: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  boutonPlus: { backgroundColor: Colors.primaryBorder, borderColor: Colors.primaryBorder, borderBottomWidth: 3, borderBottomColor: '#5da5d4' },
  soldeInfo: { fontSize: 12, color: Colors.primaryLight, lineHeight: 17 },
  soldeBas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  code: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },

  carte: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14 },
  carteTitre: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  aide: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 4 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  puce: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  puceActive: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  puceTexte: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  message: { fontSize: 12, color: Colors.textSecondary, marginTop: 10 },

  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  separateur: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rangeeTitre: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rangeeSous: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  valeur: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right' },
  petitAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  petitAvatarTexte: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  logoMoyen: { width: 48, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoMoyenTexte: { fontSize: 13, fontWeight: '900' },
  parDefaut: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  parDefautTexte: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark },

  compteurs: { flexDirection: 'row', gap: 10 },
  compteur: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  compteurValeur: { fontSize: 22, fontWeight: '800' },
  compteurLibelle: { fontSize: 12, color: Colors.textSecondary },

  langues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langueActive: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  langueActiveTexte: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  langueBientot: { backgroundColor: Colors.borderLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  langueBientotTexte: { color: Colors.textTertiary, fontSize: 12, fontWeight: '700' },

  pied: { textAlign: 'center', fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
});
