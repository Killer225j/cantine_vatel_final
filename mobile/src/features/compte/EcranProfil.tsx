import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../components/layout/EnTete';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
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
});
