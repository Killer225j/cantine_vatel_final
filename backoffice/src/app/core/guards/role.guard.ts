import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Réserve une route aux rôles de `data.roles`. La sécurité réelle est côté API (@Roles) :
 * ici on évite seulement d'afficher un écran que le serveur refuserait de servir.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.currentUser()) return router.createUrlTree(['/auth/login']);

  const roles: string[] = route.data?.['roles'] ?? [];
  if (roles.length === 0 || authService.hasRole(...roles)) return true;
  return router.createUrlTree([authService.accueil()]);
};
