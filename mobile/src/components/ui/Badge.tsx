import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

export type BadgeTone = 'neutre' | 'succes' | 'attention' | 'danger' | 'info';

const TONES: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  neutre: { bg: Colors.borderLight, text: Colors.textMuted, dot: Colors.textTertiary },
  succes: { bg: Colors.successLight, text: Colors.success, dot: Colors.success },
  attention: { bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning },
  danger: { bg: Colors.errorLight, text: Colors.error, dot: Colors.error },
  info: { bg: Colors.primaryLight, text: Colors.primaryDark, dot: Colors.primary },
};

interface Props {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

/** Pastille de statut : toujours un mot avec la couleur, jamais la couleur seule. */
export const Badge = ({ label, tone = 'neutre', style }: Props) => {
  const config = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor: config.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
