import { Stack } from 'expo-router';
import { EspaceProtege } from '../../src/components/layout/EspaceProtege';

/** Espace parent : réservé au rôle PARENT. */
export default function ParentLayout() {
  return (
    <EspaceProtege role="PARENT">
      <Stack screenOptions={{ headerShown: false }} />
    </EspaceProtege>
  );
}
