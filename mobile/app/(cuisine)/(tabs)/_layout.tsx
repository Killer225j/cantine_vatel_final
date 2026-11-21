import { Tabs } from 'expo-router';
import { AvecCloche } from '../../../src/components/layout/AvecCloche';
import { CustomTabBar, OngletDef } from '../../../src/components/layout/CustomTabBar';

const ONGLETS: OngletDef[] = [
  { name: 'index', label: 'Comptoir', icon: 'qr-code-outline' },
  { name: 'commandes', label: 'Commandes', icon: 'list-outline' },
  { name: 'profil', label: 'Profil', icon: 'person-outline' },
];

export default function CuisineTabsLayout() {
  return (
    <AvecCloche>
      <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} onglets={ONGLETS} />}
    >
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.name} name={o.name} options={{ title: o.label }} />
      ))}
      </Tabs>
    </AvecCloche>
  );
}
