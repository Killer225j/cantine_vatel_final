import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, interval } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ArticleStock,
  CantineApi,
  JourReservations,
  Prevision,
  StatsJour,
  heure,
} from '../../../../core/services/cantine-api.service';
import { StatTileComponent } from '../../../../shared/components/ui/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton.component';

interface AccesRapide {
  label: string;
  route: string;
  icone: string;
  couleur: string;
  fond: string;
  roles: string[];
}

/** Tableau de bord du jour : chiffres, affluence par créneau, prévision et alertes allergie. */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [DatePipe, RouterLink, StatTileComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  private authService = inject(AuthService);
  private api = inject(CantineApi);
  private destroyRef = inject(DestroyRef);

  readonly h = heure;
  aujourdhui = new Date();
  userName = this.authService.currentUser()?.prenom || 'à vous';

  stats = signal<StatsJour | null>(null);
  prevision = signal<Prevision | null>(null);
  erreur = signal(false);
  jours7 = signal<JourReservations[]>([]);

  tuiles = computed(() => {
    const s = this.stats();
    // L'API renvoie déjà l'écart avec le même jour de la semaine dernière.
    const evolution = s ? s.evolutionSemaineDerniere : 0;
    return [
      {
        label: 'Repas réservés',
        icone: 'pi-shopping-bag',
        valeur: s ? String(s.reserves) : '—',
        detail: s
          ? `${evolution >= 0 ? '+' : ''}${evolution} par rapport au même jour la semaine dernière`
          : '',
      },
      {
        label: 'Portions à préparer',
        icone: 'pi-calculator',
        valeur: s ? String(s.portionsAPreparer) : '—',
        detail: s ? `Absence prévue ${s.tauxAbsence.toLocaleString('fr-FR')} % · marge 5 %` : '',
      },
      {
        label: 'Taux de présence',
        icone: 'pi-check-circle',
        valeur: s ? `${s.tauxPresence.toLocaleString('fr-FR')} %` : '— %',
        detail: 'Moyenne des 4 dernières semaines',
      },
      {
        label: 'Nourriture sauvée',
        icone: 'pi-heart',
        valeur: s ? `${s.kgSauvesMois.toLocaleString('fr-FR')} kg` : '— kg',
        detail: s ? `${s.repasSauvesMois} repas sauvés ce mois-ci` : '',
      },
    ];
  });

  accesRapides: AccesRapide[] = [
    {
      label: 'Menus',
      route: '/menus',
      icone: 'pi-calendar',
      couleur: '#1b6fa8',
      fond: '#e7f3fc',
      roles: ['ADMIN'],
    },
    {
      label: 'Plats',
      route: '/plats',
      icone: 'pi-book',
      couleur: '#12507d',
      fond: '#dbeefb',
      roles: ['ADMIN'],
    },
    {
      label: 'Commandes',
      route: '/commandes',
      icone: 'pi-list-check',
      couleur: '#0d3a5c',
      fond: '#dbeefb',
      roles: ['ADMIN', 'CUISINE'],
    },
    {
      label: 'Comptoir',
      route: '/comptoir',
      icone: 'pi-qrcode',
      couleur: '#3f93cc',
      fond: '#e7f3fc',
      roles: ['ADMIN', 'CUISINE'],
    },
  ];
  visibles = computed(() => {
    const role = this.authService.currentUser()?.role;
    return this.accesRapides.filter((a) => !!role && a.roles.includes(role));
  });

  /** Articles sous leur seuil d'alerte (ruptures d'abord) ; null tant que le chargement n'a pas abouti. */
  stocksBas = signal<ArticleStock[] | null>(null);

  ngOnInit(): void {
    this.charger();
    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charger());
  }

  private charger(): void {
    this.api.stocks().subscribe({
      next: (st) =>
        this.stocksBas.set(
          st.articles
            .filter((a) => a.statut !== 'OK')
            .sort((x, y) => x.niveau - y.niveau),
        ),
      error: () => this.stocksBas.set([]),
    });
    this.api
      .reservations7Jours()
      .subscribe({ next: (j) => this.jours7.set(j), error: () => undefined });
    forkJoin([this.api.statsJour(), this.api.prevision()]).subscribe({
      next: ([stats, prevision]) => {
        this.stats.set(stats);
        this.prevision.set(prevision);
        this.erreur.set(false);
      },
      error: () => this.erreur.set(true),
    });
  }

  /** Hauteur d'une barre (en %) par rapport au plus grand jour de la période. */
  hauteur(valeur: number): number {
    const max = Math.max(1, ...this.jours7().map((j) => j.reservees));
    return Math.round((valeur / max) * 100);
  }

  pourcentage(reserves: number, capacite: number): number {
    return capacite ? Math.min(100, Math.round((reserves / capacite) * 100)) : 0;
  }
}
