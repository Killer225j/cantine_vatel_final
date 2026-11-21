import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../../src/components/layout/EnTete';
import { Bientot } from '../../../src/components/ui/Bientot';
import { Colors } from '../../../src/constants/colors';

export default function Recharger() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <EnTete surtitre="Parent" titre="Recharger le compte" sousTitre="Wave ou Orange Money, sans espèces." />
        <Bientot
          icon="phone-portrait-outline"
          titre="Paiement Mobile Money"
          texte="Rechargez le compte cantine de votre enfant en quelques secondes (paiement simulé pour la démo)."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },
});
