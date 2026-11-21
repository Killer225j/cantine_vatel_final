import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { StatTileComponent } from '../../../../shared/components/ui/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state.component';

interface Stat {
  label: string;
  valeur: string;
  detail: string;
}

interface AccesRapide {
  label: string;
  route: string;
  icone: string;
  couleur: string;
  fond: string;
}

/**
 * Tableau de bord du squelette. Les valeurs « — » sont des emplacements : elles seront
 * branchées sur l'API avec le modèle de données (réservations, créneaux, stocks).
 */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [DatePipe, RouterLink, StatTileComponent, EmptyStateComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent {
  private authService = inject(AuthService);

  aujourdhui = new Date();
  userName = this.authService.currentUser()?.prenom || 'à vous';

  stats: Stat[] = [
    { label: 'Repas réservés', valeur: '—', detail: "Réservations confirmées aujourd'hui" },
    { label: 'Portions à préparer', valeur: '—', detail: 'Prévision anti-gaspillage' },
    { label: 'Taux de présence', valeur: '— %', detail: 'Moyenne des 4 dernières semaines' },
    { label: 'Nourriture sauvée', valeur: '— kg', detail: 'Depuis le début du mois' },
  ];

  creneaux = [
    { heure: '11h45 – 12h00', capacite: 40 },
    { heure: '12h00 – 12h15', capacite: 40 },
    { heure: '12h15 – 12h30', capacite: 40 },
    { heure: '12h30 – 12h45', capacite: 40 },
    { heure: '12h45 – 13h00', capacite: 40 },
  ];

  accesRapides: AccesRapide[] = [
    { label: 'Menus', route: '/menus', icone: 'pi-calendar', couleur: '#1b6fa8', fond: '#e7f3fc' },
    { label: 'Commandes', route: '/commandes', icone: 'pi-list-check', couleur: '#0d3a5c', fond: '#dbeefb' },
    { label: 'Stocks', route: '/stocks', icone: 'pi-box', couleur: '#3f93cc', fond: '#e7f3fc' },
    { label: 'Rapports', route: '/rapports', icone: 'pi-chart-bar', couleur: '#12507d', fond: '#dbeefb' },
  ];
}
