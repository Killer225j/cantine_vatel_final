import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Brique de base d'un "skeleton screen" : un bloc qui pulse doucement pour
 * signaler un chargement, à la place d'un simple spinner. On compose ces
 * blocs pour reprendre la forme du vrai contenu (voir ListeSkeleton plus bas).
 */
export const SkeletonBlock = ({ width = '100%', height = 14, borderRadius = 8, style }: Props) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.borderLight, opacity },
        style,
      ]}
    />
  );
};

/** Une liste de cartes en chargement (réservations, plats, historique…). */
export const ListeSkeleton = ({ lignes = 3 }: { lignes?: number }) => (
  <View style={styles.pad}>
    {Array.from({ length: lignes }, (_, i) => (
      <View key={i} style={styles.carte}>
        <View style={styles.ligne}>
          <SkeletonBlock width={44} height={44} borderRadius={12} />
          <View style={[styles.flex1, { marginLeft: 12 }]}>
            <SkeletonBlock width="60%" height={13} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="40%" height={11} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 16 },
  flex1: { flex: 1 },
  carte: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  ligne: { flexDirection: "row", alignItems: "center" },
});
