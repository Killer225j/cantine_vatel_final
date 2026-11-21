import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { accueilDuRole, useAuth } from '../../features/auth/useAuth';
import { Role } from '../../types/api.types';

/**
 * N'affiche un espace qu'au rôle qui y a droit. La sécurité réelle est côté API : ici, on évite
 * seulement d'afficher un écran que le serveur refuserait de servir.
 */
export function EspaceProtege({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useAuth();

  if (!state.ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }
  if (!state.isAuthenticated || !state.user) return <Redirect href="/(auth)/login" />;
  if (state.user.role !== role) return <Redirect href={accueilDuRole(state.user.role) as never} />;
  return <>{children}</>;
}
