import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../../src/components/layout/EnTete';
import { Bientot } from '../../../src/components/ui/Bientot';
import { Colors } from '../../../src/constants/colors';

export default function MesEnfants() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <EnTete surtitre="Parent" titre="Mes enfants" sousTitre="Ce qu’ils mangent et leur solde, au quotidien." />
        <Bientot
          icon="restaurant-outline"
          titre="Repas du jour"
          texte="« Aujourd’hui, Koffi a mangé : attiéké poisson. » Le récapitulatif de chaque repas."
        />
        <Bientot
          icon="notifications-outline"
          titre="Alerte de solde bas"
          texte="Vous serez prévenu quand le solde de votre enfant passe sous le seuil choisi."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },
});
