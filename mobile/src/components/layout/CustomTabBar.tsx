import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export interface OngletDef {
  /** Nom du fichier de route (ex. `index`, `profil`). */
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

type Props = BottomTabBarProps & { onglets: OngletDef[] };

/** Barre d'onglets commune aux espaces élève et parent : pastille sur l'onglet actif. */
// Depuis expo-router 58 (React Navigation embarqué), la barre reçoit `emitter` et
// `navigateToTab` au lieu de l'objet `navigation`.
export const CustomTabBar = ({ state, emitter, navigateToTab, onglets }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const onglet = onglets.find((o) => o.name === route.name);
        if (!onglet) return null;
        const actif = state.index === index;

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!actif && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            accessibilityLabel={onglet.label}
          >
            {actif ? (
              <View style={styles.activePill}>
                <Ionicons name={onglet.icon} size={20} color={Colors.primary} />
                <Text style={styles.activeLabel}>{onglet.label}</Text>
              </View>
            ) : (
              <Ionicons name={onglet.icon} size={22} color={Colors.textTertiary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: { alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
