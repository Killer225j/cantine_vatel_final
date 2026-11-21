import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

registerLocaleData(localeFr);

/** Au démarrage : si un jeton est en stock, on recharge le profil (refresh compris si besoin). */
function initAuth(authService: AuthService) {
  return () => {
    if (!authService.jetonAcces()) return of(null);
    return authService.loadProfile().pipe(
      catchError(() => {
        authService.oublier();
        return of(null);
      }),
    );
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    // authInterceptor d'abord : errorInterceptor ne voit que les 401 que le refresh n'a pas réparés.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr' },
    { provide: APP_INITIALIZER, useFactory: initAuth, deps: [AuthService], multi: true },
  ],
};
