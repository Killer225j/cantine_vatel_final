import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  titre: string;
  texte: string;
}

/** Carte « bientôt disponible » des écrans du squelette, remplacée écran par écran. */
export function Bientot({ icon, titre, texte }: Props) {
  return (
    <View style={styles.carte}>
      <View style={styles.pastille}>
        <Ionicons name={icon} size={26} color={Colors.primary} />
      </View>
      <Text style={styles.titre}>{titre}</Text>
      <Text style={styles.texte}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  pastille: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  texte: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
