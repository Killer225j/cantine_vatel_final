import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../../src/components/layout/EnTete';
import { Bientot } from '../../../src/components/ui/Bientot';
import { Colors } from '../../../src/constants/colors';

export default function MesReservations() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <EnTete surtitre="Élève" titre="Mes réservations" sousTitre="Votre QR code à présenter au comptoir." />
        <Bientot
          icon="qr-code-outline"
          titre="QR code de réservation"
          texte="Après une réservation, votre QR code et son code de secours s’afficheront ici."
        />
        <Bientot
          icon="wallet-outline"
          titre="Solde et historique"
          texte="Votre solde de cantine et l’historique de vos repas."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },
});
