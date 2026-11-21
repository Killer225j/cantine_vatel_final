import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  uri: string | null | undefined;
  nom: string;
  taille?: number;
  /** Hauteur différente de la largeur (photo en bandeau). */
  largeur?: number | `${number}%`;
  rayon?: number;
}

/** Photo d'un plat ; si le fichier manque, les initiales sur fond pâle. */
export function PhotoPlat({ uri, nom, taille = 64, largeur, rayon = 14 }: Props) {
  const [echec, setEchec] = useState(false);
  const dimensions = { width: largeur ?? taille, height: taille, borderRadius: rayon };
  const initiales = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('');

  if (uri && !echec) {
    return <Image source={{ uri }} style={[dimensions, styles.image]} onError={() => setEchec(true)} />;
  }
  return (
    <View style={[dimensions, styles.repli]}>
      <Text style={[styles.initiales, { fontSize: Math.max(14, taille / 3) }]}>{initiales}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.primaryLight },
  repli: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  initiales: { color: Colors.primaryDark, fontWeight: '800' },
});
