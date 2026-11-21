import { Tabs } from 'expo-router';
import { CustomTabBar, OngletDef } from '../../../src/components/layout/CustomTabBar';

const ONGLETS: OngletDef[] = [
  { name: 'index', label: 'Menu', icon: 'restaurant-outline' },
  { name: 'reservations', label: 'Réservations', icon: 'qr-code-outline' },
  { name: 'profil', label: 'Profil', icon: 'person-outline' },
];

export default function EleveTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} onglets={ONGLETS} />}
    >
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.name} name={o.name} options={{ title: o.label }} />
      ))}
    </Tabs>
  );
}
