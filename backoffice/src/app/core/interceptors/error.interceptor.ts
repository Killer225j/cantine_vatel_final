import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { apiErrorMessage } from '../utils/http-error.utils';
import { SILENT_HTTP_ERROR } from './silent-error.token';

/**
 * Gestion d'erreur HTTP centralisée (placée après `authInterceptor`, elle ne voit que les 401
 * que le refresh n'a pas pu réparer) :
 * - 401 : session terminée → déconnexion + retour à la connexion (sauf pendant la connexion).
 * - 0   : requête jamais arrivée (réseau coupé, API Render endormie…).
 * - autres : message de l'API affiché tel quel, sauf requête marquée `SILENT_HTTP_ERROR`.
 *
 * L'erreur est toujours relancée : le composant garde son propre `error:` pour son état d'UI.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const pendantConnexion = req.url.includes('/auth/login');
        if (error.status === 401 && !pendantConnexion) {
          if (authService.isLoggedIn()) authService.oublier();
          router.navigate(['/auth/login']);
        } else if (error.status === 0) {
          toastService.error('Impossible de joindre le serveur. Vérifiez votre connexion.');
        } else if (!pendantConnexion && !req.context.get(SILENT_HTTP_ERROR)) {
          toastService.error(apiErrorMessage(error, 'Une erreur est survenue.'));
        }
      }
      return throwError(() => error);
    }),
  );
};
