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
      {
        path: 'menus',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/menus/menus.component').then((m) => m.MenusComponent),
      },
      {
        path: 'plats',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/plats/plats.component').then((m) => m.PlatsComponent),
      },
      {
        path: 'commandes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CUISINE'] },
        loadComponent: () =>
          import('./features/commandes/commandes.component').then((m) => m.CommandesComponent),
      },
      {
        path: 'anti-gaspi',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CUISINE'] },
        loadComponent: () =>
          import('./features/anti-gaspi/anti-gaspi.component').then((m) => m.AntiGaspiComponent),
      },
      {
        path: 'comptoir',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CUISINE'] },
        loadComponent: () =>
          import('./features/comptoir/comptoir.component').then((m) => m.ComptoirComponent),
      },
      {
        path: 'stocks',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CUISINE'] },
        loadComponent: () =>
          import('./features/stocks/stocks.component').then((m) => m.StocksComponent),
      },
      {
        path: 'rapports',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/rapports/rapports.component').then((m) => m.RapportsComponent),
      },
      {
        path: 'comptes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/comptes/comptes.component').then((m) => m.ComptesComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/auth/pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
