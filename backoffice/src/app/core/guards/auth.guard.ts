import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Barre l'accès à l'application à qui n'a pas de session. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return authService.isLoggedIn() ? true : inject(Router).createUrlTree(['/auth/login']);
};

/** Empêche une personne déjà connectée de revenir sur la page de connexion. */
export const dejaConnecteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return authService.isLoggedIn() ? inject(Router).createUrlTree([authService.accueil()]) : true;
};
