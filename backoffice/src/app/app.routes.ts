import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './shared/components/layout/main-layout/main-layout.component';

const EN_PREPARATION = () =>
  import('./features/en-preparation/en-preparation.component').then(
    (m) => m.EnPreparationComponent,
  );

/** Une section du menu pas encore construite : la page dit ce qu'elle fera. */
function section(path: string, roles: string[], titre: string, icone: string, description: string) {
  return {
    path,
    canActivate: [roleGuard],
    data: { roles, titre, icone, description },
    loadComponent: EN_PREPARATION,
  };
}

export const routes: Routes = [
  // Public
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Application (header + barre latérale), réservée à l'administration et à la cuisine
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CUISINE'] },
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      section(
        'menus',
        ['ADMIN'],
        'Menus de la semaine',
        'pi-calendar',
        'Créer et publier les menus : plats du jour, prix, allergènes et portions prévues.',
      ),
      section(
        'commandes',
        ['ADMIN', 'CUISINE'],
        'Commandes du jour',
        'pi-list-check',
        'Les réservations par créneau, en direct, pour préparer le bon nombre de portions.',
      ),
      section(
        'comptoir',
        ['ADMIN', 'CUISINE'],
        'Comptoir',
        'pi-qrcode',
        'Scanner le QR code de réservation, avec alerte allergie au moment du service.',
      ),
      section(
        'stocks',
        ['ADMIN', 'CUISINE'],
        'Stocks',
        'pi-box',
        'Suivre les quantités et être alerté avant une rupture.',
      ),
      section(
        'rapports',
        ['ADMIN'],
        'Rapports',
        'pi-chart-bar',
        'Fréquentation, recettes, gaspillage évité : exports CSV pour la direction.',
      ),
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/auth/pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
