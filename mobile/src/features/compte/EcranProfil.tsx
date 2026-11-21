import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../components/layout/EnTete';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Allergene, cantineApi, fcfa, Portefeuille } from '../../api/cantine.api';
import { Role } from '../../types/api.types';
import { useAuth } from '../auth/useAuth';

const LIBELLE_ROLE: Record<Role, string> = {
  ELEVE: 'Élève',
  PARENT: 'Parent',
  ADMIN: 'Administration',
  CUISINE: 'Cuisine',
};

/** Profil commun aux deux espaces : identité, rôle, déconnexion. */
export function EcranProfil() {
  const { state, logout } = useAuth();
  const user = state.user;
  const nom = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

  const seDeconnecter = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <EnTete surtitre={user ? LIBELLE_ROLE[user.role] : undefined} titre="Mon profil" />

        <View style={styles.carte}>
          <Ligne libelle="Nom" valeur={nom ?? '—'} />
          <Ligne libelle="Email" valeur={user?.email ?? '—'} />
          <Ligne libelle="Téléphone" valeur={user?.phone ?? 'Non renseigné'} dernier />
        </View>

        {user?.role === 'ELEVE' && <SectionEleve />}

        <Button
          label="Se déconnecter"
          variant="outline"
          onPress={seDeconnecter}
          style={styles.bouton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Solde, code de liaison pour le parent, et allergies déclarées (elles pilotent les alertes). */
function SectionEleve() {
  const [tous, setTous] = useState<Allergene[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [code, setCode] = useState<string>('—');
  const [portefeuille, setPortefeuille] = useState<Portefeuille | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([cantineApi.allergenes(), cantineApi.mesAllergies(), cantineApi.codeLiaison(), cantineApi.portefeuille()])
      .then(([a, m, c, p]) => {
        setTous(a);
        setMes(m.map((x) => x.code));
        setCode(c.codeLiaison);
        setPortefeuille(p);
      })
      .catch(() => setMessage('Impossible de charger votre profil de cantine.'));
  }, []);

  const basculer = async (codeAllergene: string) => {
    const avant = mes;
    const apres = mes.includes(codeAllergene) ? mes.filter((c) => c !== codeAllergene) : [...mes, codeAllergene];
    setMes(apres);
    try {
      await cantineApi.definirAllergies(apres);
      setMessage('Allergies enregistrées.');
    } catch {
      setMes(avant);
      setMessage("L'enregistrement a échoué. Réessayez.");
    }
  };

  return (
    <>
      <View style={[styles.carte, { marginTop: 16 }]}>
        <Ligne libelle="Solde de cantine" valeur={portefeuille ? fcfa(portefeuille.solde) : '—'} />
        <Ligne libelle="Code de liaison (à donner à votre parent)" valeur={code} dernier />
      </View>

      <Text style={styles.titreSection}>Mes allergies</Text>
      <Text style={styles.aide}>Les plats concernés sont signalés, et la cuisine contrôle avant de vous servir.</Text>
      <View style={styles.carte}>
        {tous.map((a, i) => {
          const coche = mes.includes(a.code);
          return (
            <TouchableOpacity
              key={a.code}
              onPress={() => basculer(a.code)}
              style={[styles.ligneAllergie, i < tous.length - 1 && styles.separateur]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: coche }}
            >
              <Ionicons name={coche ? 'checkbox' : 'square-outline'} size={22} color={coche ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.valeur, coche && { color: Colors.primaryDark, fontWeight: '700' }]}>{a.nom}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {message ? <Text style={styles.aide}>{message}</Text> : null}
    </>
  );
}

function Ligne({ libelle, valeur, dernier }: { libelle: string; valeur: string; dernier?: boolean }) {
  return (
    <View style={[styles.ligne, !dernier && styles.separateur]}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Text style={styles.valeur}>{valeur}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },
  carte: { backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: 16 },
  ligne: { paddingVertical: 14, gap: 2 },
  separateur: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  libelle: { fontSize: 12, color: Colors.textSecondary },
  valeur: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  bouton: { marginTop: 24 },
  titreSection: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 4 },
  aide: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10, marginTop: 4 },
  ligneAllergie: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
});
