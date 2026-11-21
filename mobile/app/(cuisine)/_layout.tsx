import { Stack } from 'expo-router';
import { EspaceProtege } from '../../src/components/layout/EspaceProtege';

/** Espace cuisine : réservé au rôle CUISINE (comptoir et commandes du jour). */
export default function CuisineLayout() {
  return (
    <EspaceProtege role="CUISINE">
      <Stack screenOptions={{ headerShown: false }} />
    </EspaceProtege>
  );
}
