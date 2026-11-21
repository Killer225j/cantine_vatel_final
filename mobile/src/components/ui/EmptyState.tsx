import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Button } from './Button';

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPress?: () => void;
  /**
   * `alerte` pour une recherche qui n'aboutit pas — la personne cherchait quelque chose et
   * repart les mains vides. Le défaut reste neutre : un historique sans notification ou sans
   * paiement n'est pas une mauvaise nouvelle, et peindre ces écrans en rouge userait le
   * signal là où il compte.
   */
  ton?: 'neutre' | 'alerte';
}

export const EmptyState = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  onPress,
  ton = 'neutre',
}: Props) => {
  const alerte = ton === 'alerte';

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, alerte && styles.iconWrapAlerte]}>{icon}</View>
      <Text style={[styles.title, alerte && styles.titleAlerte]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel && onPress && (
        <Button
          label={buttonLabel}
          onPress={onPress}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapAlerte: { backgroundColor: Colors.errorLight },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  titleAlerte: { color: Colors.error },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  button: {
    paddingHorizontal: 28,
  },
});