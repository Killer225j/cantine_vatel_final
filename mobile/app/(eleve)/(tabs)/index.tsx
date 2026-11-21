import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnTete } from '../../../src/components/layout/EnTete';
import { Bientot } from '../../../src/components/ui/Bientot';
import { Colors } from '../../../src/constants/colors';

export default function MenuSemaine() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <EnTete surtitre="Élève" titre="Menu de la semaine" sousTitre="Les plats du jour, leurs prix et leurs allergènes." />
        <Bientot
          icon="calendar-outline"
          titre="Menu de la semaine"
          texte="Chaque jour, les plats proposés avec leur prix. Les plats incompatibles avec vos allergies seront signalés."
        />
        <Bientot
          icon="time-outline"
          titre="Réserver un créneau"
          texte="Choisissez votre plat et votre heure de passage (12h15 – 12h30…) pour éviter la file."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },
});
