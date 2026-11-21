import { Tabs } from 'expo-router';
import { AvecCloche } from '../../../src/components/layout/AvecCloche';
import { CustomTabBar, OngletDef } from '../../../src/components/layout/CustomTabBar';

const ONGLETS: OngletDef[] = [
  { name: 'index', label: 'Enfants', icon: 'people-outline' },
  { name: 'recharge', label: 'Recharger', icon: 'card-outline' },
  { name: 'profil', label: 'Profil', icon: 'person-outline' },
];

export default function ParentTabsLayout() {
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
