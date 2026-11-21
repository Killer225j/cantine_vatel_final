import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  surtitre?: string;
  titre: string;
  sousTitre?: string;
}

/** Titre de page commun : surtitre discret, grand titre, sous-titre facultatif. */
export function EnTete({ surtitre, titre, sousTitre }: Props) {
  return (
    <View style={styles.wrap}>
      {surtitre ? <Text style={styles.surtitre}>{surtitre}</Text> : null}
      <Text style={styles.titre}>{titre}</Text>
      {sousTitre ? <Text style={styles.sous}>{sousTitre}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  surtitre: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titre: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  sous: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
});
