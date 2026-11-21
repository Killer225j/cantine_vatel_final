import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import {
  Allergene,
  cantineApi,
  Commandes,
  Enfant,
  fcfa,
  ProfilEleve,
} from '../../api/cantine.api';
import { Role } from '../../types/api.types';
import { useAuth } from '../auth/useAuth';

const LIBELLE_ROLE: Record<Role, string> = {
  ELEVE: 'Élève',
  PARENT: 'Parent',
  ADMIN: 'Administration',
  CUISINE: 'Cuisine',
};

/** Profil commun aux trois espaces : identité, cloche, puis le bloc propre au rôle. */
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

  const [nonLues, setNonLues] = useState(0);
  const [profil, setProfil] = useState<ProfilEleve | null>(null);
  const [tous, setTous] = useState<Allergene[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [service, setService] = useState<Commandes | null>(null);

  useFocusEffect(
    useCallback(() => {
      cantineApi.notifications().then((n) => setNonLues(n.nonLues)).catch(() => undefined);
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
    }, [role]),
  );

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

  const sousTitre =
    role === 'ELEVE'
      ? ['Élève', profil?.classe].filter(Boolean).join(' · ')
      : role
        ? LIBELLE_ROLE[role]
        : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identité + cloche */}
        <View style={styles.entete}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>{initiales || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{nom}</Text>
            <Text style={styles.sousTitre}>{sousTitre}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.cloche}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${nonLues ? `, ${nonLues} non lues` : ''}`}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            {nonLues > 0 && (
              <View style={styles.pastilleNonLues}>
                <Text style={styles.pastilleTexte}>{nonLues > 9 ? '9+' : nonLues}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Élève : solde, code de liaison, allergies ─── */}
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
              <Text style={styles.soldeMontant}>{profil ? fcfa(profil.solde) : '—'}</Text>
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

            <View style={styles.carte}>
              <Text style={styles.carteTitre}>Mes allergies</Text>
              <Text style={styles.carteAide}>
                Les plats concernés sont signalés en rouge et le comptoir est alerté au scan.
              </Text>
              <View style={styles.puces}>
                {tous.map((a) => {
                  const coche = mes.includes(a.code);
                  return (
                    <TouchableOpacity
                      key={a.code}
                      onPress={() => basculer(a.code)}
                      style={[styles.puce, coche && styles.puceActive]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: coche }}
                    >
                      <Ionicons name={coche ? 'checkbox' : 'square-outline'} size={18} color={coche ? Colors.error : Colors.textTertiary} />
                      <Text style={[styles.puceTexte, coche && { color: Colors.error, fontWeight: '800' }]}>{a.nom}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          </>
        )}

        {/* ─── Parent : enfants suivis ─── */}
        {role === 'PARENT' && (
          <View style={styles.carte}>
            <Text style={styles.carteTitre}>Enfants suivis</Text>
            {enfants.length === 0 ? (
              <Text style={styles.carteAide}>Aucun enfant lié pour l’instant : ajoutez-en un depuis l’onglet Enfants.</Text>
            ) : (
              enfants.map((e, i) => (
                <View key={e.id} style={[styles.ligne, i < enfants.length - 1 && styles.separateur]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ligneNom}>{e.nom}</Text>
                    <Text style={styles.ligneInfo}>
                      {e.classe ?? '—'} · alerte sous {fcfa(e.seuilAlerte)}
                    </Text>
                  </View>
                  <Text style={[styles.ligneSolde, e.soldeBas && { color: Colors.warning }]}>{fcfa(e.solde)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── Cuisine : service du jour ─── */}
        {role === 'CUISINE' && (
          <View style={styles.carte}>
            <Text style={styles.carteTitre}>Service du jour</Text>
            <View style={styles.compteurs}>
              <Compteur valeur={service?.compteurs.servies} libelle="Servis" couleur={Colors.success} />
              <Compteur valeur={service?.compteurs.aServir} libelle="Restants" couleur={Colors.primary} />
              <Compteur valeur={service?.compteurs.aRisqueAllergique} libelle="À risque" couleur={Colors.error} />
            </View>
            <Text style={styles.carteAide}>Comptoir principal · le contrôle allergie est obligatoire avant de servir.</Text>
          </View>
        )}

        {/* ─── Identité ─── */}
        <View style={styles.carte}>
          <Text style={styles.carteTitre}>Mes informations</Text>
          <View style={[styles.ligne, styles.separateur]}>
            <Text style={styles.ligneInfo}>Email</Text>
            <Text style={styles.valeur}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.ligneInfo}>Téléphone</Text>
            <Text style={styles.valeur}>{user?.phone ?? 'Non renseigné'}</Text>
          </View>
        </View>

        <Button label="Se déconnecter" variant="outline" onPress={seDeconnecter} style={{ marginTop: 8 }} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },

  entete: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  nom: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sousTitre: { fontSize: 13, color: Colors.primary, marginTop: 1, fontWeight: '600' },
  cloche: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  pastilleNonLues: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pastilleTexte: { color: Colors.white, fontSize: 10, fontWeight: '800' },

  solde: { backgroundColor: '#0d3a5c', borderRadius: 22, padding: 18, overflow: 'hidden' },
  soldeCercle: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(135,193,235,0.18)' },
  soldeHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soldeLibelle: { fontSize: 12, color: Colors.primaryBorder, fontWeight: '600' },
  badgeBas: { backgroundColor: '#fde68a', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  badgeBasTexte: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  soldeMontant: { fontSize: 34, fontWeight: '800', color: Colors.white, marginVertical: 6, letterSpacing: -0.5 },
  soldeInfo: { fontSize: 12, color: Colors.primaryLight, lineHeight: 17 },
  soldeBas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  code: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },

  carte: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  carteTitre: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  carteAide: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 4 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  puce: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  puceActive: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  puceTexte: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  message: { fontSize: 12, color: Colors.textSecondary, marginTop: 10 },

  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  separateur: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  ligneNom: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ligneInfo: { fontSize: 12, color: Colors.textSecondary },
  ligneSolde: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  valeur: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  compteurs: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  compteur: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  compteurValeur: { fontSize: 22, fontWeight: '800' },
  compteurLibelle: { fontSize: 12, color: Colors.textSecondary },
});
