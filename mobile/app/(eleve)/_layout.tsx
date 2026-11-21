import { Stack } from 'expo-router';
import { EspaceProtege } from '../../src/components/layout/EspaceProtege';

/** Espace eleve : réservé au rôle ELEVE. */
export default function EleveLayout() {
  return (
    <EspaceProtege role="ELEVE">
      <Stack screenOptions={{ headerShown: false }} />
    </EspaceProtege>
  );
}
