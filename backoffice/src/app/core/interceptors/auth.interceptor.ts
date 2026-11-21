import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, Jetons } from '../services/auth.service';

/** Routes qui gèrent leur 401 elles-mêmes : un mauvais mot de passe n'est pas un jeton expiré. */
const ROUTES_SANS_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh'];

/** Un seul refresh en vol, même si plusieurs requêtes échouent en 401 en même temps. */
let refreshEnCours: Observable<string> | null = null;

function avecJeton(req: HttpRequest<unknown>, jeton: string | null): HttpRequest<unknown> {
  return jeton ? req.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }) : req;
}

/**
 * Pose `Authorization: Bearer <jeton>` sur les appels à l'API, et sur un 401 tente une fois
 * de renouveler la paire de jetons avant de rejouer la requête.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const sansRefresh = ROUTES_SANS_REFRESH.some((r) => req.url.includes(r));

  return next(avecJeton(req, auth.jetonAcces())).pipe(
    catchError((err: unknown) => {
      const refresh = auth.jetonRefresh();
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || sansRefresh || !refresh) {
        return throwError(() => err);
      }

      refreshEnCours ??= http
        .post<{ data: Jetons }>(`${environment.apiUrl}/auth/refresh`, { refreshToken: refresh })
        .pipe(
          map((r) => {
            auth.enregistrer(r.data);
            return r.data.accessToken;
          }),
          finalize(() => (refreshEnCours = null)),
          shareReplay(1),
        );

      return refreshEnCours.pipe(
        switchMap((jeton) => next(avecJeton(req, jeton))),
        catchError(() => throwError(() => err)),
      );
    }),
  );
};
