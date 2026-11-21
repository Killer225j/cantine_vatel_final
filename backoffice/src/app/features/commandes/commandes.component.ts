import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import {
  CantineApi,
  Commandes,
  Creneau,
  Reservation,
  StatutReservation,
  heure,
} from '../../core/services/cantine-api.service';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';

const STATUTS: Record<StatutReservation, { libelle: string; couleur: BadgeColor }> = {
  CONFIRMEE: { libelle: 'À servir', couleur: 'info' },
  SERVIE: { libelle: 'Servie', couleur: 'success' },
  ABSENT: { libelle: 'Absent', couleur: 'warning' },
  ANNULEE: { libelle: 'Annulée', couleur: 'neutral' },
};

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [
    DatePipe,
    StatTileComponent,
    FormsModule,
    RouterLink,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Commandes du jour</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          {{ aujourdhui | date: 'EEEE d MMMM' }} ·
          <span
            class="inline-flex items-center gap-1.5 font-semibold"
            [class.text-success]="direct()"
          >
            <span
              class="w-2 h-2 rounded-full"
              [class]="direct() ? 'bg-success animate-pulse' : 'bg-gray-400'"
            ></span>
            {{ direct() ? 'En direct' : 'En pause' }}
          </span>
          <button
            type="button"
            class="ml-2 underline text-xs text-gray-500"
            (click)="direct.set(!direct())"
          >
            {{ direct() ? 'Mettre en pause' : 'Reprendre' }}
          </button>
        </p>
      </div>
      <a
        routerLink="/comptoir"
        class="px-4 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark"
      >
        <i class="pi pi-qrcode mr-1.5"></i>Ouvrir le comptoir
      </a>
    </div>

    @if (donnees(); as d) {
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        @for (t of tuiles(); track t.label) {
          <app-stat-tile [value]="t.valeur" [label]="t.label" [icon]="t.icone" />
        }
      </div>

      @if (d.compteurs.aRisqueAllergique > 0) {
        <div
          class="mb-4 flex items-center gap-3 rounded-xl border border-error/30 bg-red-50 text-error px-4 py-3 text-sm"
        >
          <i class="pi pi-exclamation-triangle"></i>
          <span>
            <strong>{{ d.compteurs.aRisqueAllergique }} réservations à risque allergique</strong>
            aujourd'hui : le contrôle sera demandé au comptoir.
          </span>
          <button
            type="button"
            class="ml-auto underline font-semibold"
            (click)="seulementRisque.set(!seulementRisque())"
          >
            {{ seulementRisque() ? 'Tout afficher' : 'Les voir' }}
          </button>
        </div>
      }

      <app-card>
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="search"
            placeholder="Rechercher un élève ou un code"
            [ngModel]="recherche()"
            (ngModelChange)="recherche.set($event)"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-vatel-primary"
          />
          <select
            [ngModel]="creneauId()"
            (ngModelChange)="creneauId.set($event)"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tous les créneaux</option>
            @for (c of creneaux(); track c.id) {
              <option [value]="c.id">
                {{ h(c.heureDebut) }}{{ c.complet ? ' · complet' : '' }}
              </option>
            }
          </select>
          <select
            [ngModel]="statut()"
            (ngModelChange)="statut.set($event)"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="CONFIRMEE">À servir</option>
            <option value="SERVIE">Servies</option>
            <option value="ABSENT">Absents</option>
            <option value="ANNULEE">Annulées</option>
          </select>
          <span class="ml-auto text-xs text-gray-500"
            >{{ visibles().length }} / {{ d.reservations.length }} lignes</span
          >
        </div>

        @if (visibles().length) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th class="py-2 pr-3 font-semibold">Élève</th>
                  <th class="py-2 pr-3 font-semibold">Code</th>
                  <th class="py-2 pr-3 font-semibold">Plat</th>
                  <th class="py-2 pr-3 font-semibold">Créneau</th>
                  <th class="py-2 pr-3 font-semibold">Allergies</th>
                  <th class="py-2 pr-3 font-semibold">Statut</th>
                  <th class="py-2 font-semibold">Servie à</th>
                </tr>
              </thead>
              <tbody>
                @for (r of visibles(); track r.id) {
                  <tr
                    class="border-b border-gray-100"
                    [class.bg-red-50]="r.alertesAllergie.length && r.statut === 'CONFIRMEE'"
                  >
                    <td class="py-2.5 pr-3">
                      <span class="font-semibold text-gray-800">{{ r.eleve.nom }}</span>
                      <span class="block text-xs text-gray-500">{{ r.eleve.classe || '—' }}</span>
                    </td>
                    <td class="py-2.5 pr-3 font-mono text-xs text-gray-600">{{ r.code }}</td>
                    <td class="py-2.5 pr-3">{{ r.plat.nom }}</td>
                    <td class="py-2.5 pr-3">{{ h(r.creneau.heureDebut) }}</td>
                    <td class="py-2.5 pr-3">
                      @for (a of r.eleve.allergenes; track a.code) {
                        <app-badge [color]="risque(r, a.code) ? 'error' : 'neutral'">{{
                          a.nom
                        }}</app-badge>
                      } @empty {
                        <span class="text-gray-400">—</span>
                      }
                    </td>
                    <td class="py-2.5 pr-3">
                      <app-badge [color]="STATUTS[r.statut].couleur">{{
                        STATUTS[r.statut].libelle
                      }}</app-badge>
                    </td>
                    <td class="py-2.5 text-gray-600">
                      {{ r.servieLe ? (r.servieLe | date: 'HH:mm') : '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="pi-list-check"
            title="Aucune réservation"
            message="Aucune ligne ne correspond à ces filtres."
            actionLabel="Réinitialiser les filtres"
            (action)="reinitialiser()"
          />
        }
      </app-card>
    } @else if (erreur()) {
      <app-card
        ><app-empty-state
          icon="pi-wifi"
          title="Chargement impossible"
          [message]="erreur()"
          actionLabel="Réessayer"
          (action)="charger()"
      /></app-card>
    } @else {
      <div class="grid grid-cols-5 gap-3 mb-5">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <app-skeleton height="76px" radius="12px" />
        }
      </div>
      <app-skeleton height="320px" radius="12px" />
    }
  `,
})
export class CommandesComponent implements OnInit {
  private api = inject(CantineApi);
  private destroyRef = inject(DestroyRef);

  readonly STATUTS = STATUTS;
  readonly h = heure;
  aujourdhui = new Date();

  donnees = signal<Commandes | null>(null);
  creneaux = signal<Creneau[]>([]);
  erreur = signal('');
  direct = signal(true);
  recherche = signal('');
  creneauId = signal('');
  statut = signal('');
  seulementRisque = signal(false);

  tuiles = computed(() => {
    const c = this.donnees()?.compteurs;
    if (!c) return [];
    return [
      {
        label: 'Réservations',
        valeur: c.total,
        classe: 'text-vatel-primary-dark',
        icone: 'pi-list-check',
      },
      { label: 'Servies', valeur: c.servies, classe: 'text-success', icone: 'pi-check-circle' },
      { label: 'À servir', valeur: c.aServir, classe: 'text-vatel-primary', icone: 'pi-clock' },
      { label: 'Absents', valeur: c.absents, classe: 'text-warning', icone: 'pi-user-minus' },
      { label: 'Annulées', valeur: c.annulees, classe: 'text-gray-500', icone: 'pi-times-circle' },
    ];
  });

  visibles = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return (this.donnees()?.reservations ?? []).filter(
      (r) =>
        (!this.creneauId() || r.creneau.id === this.creneauId()) &&
        (!this.statut() || r.statut === this.statut()) &&
        (!this.seulementRisque() || (r.alertesAllergie.length > 0 && r.statut !== 'ANNULEE')) &&
        (!q || r.code.toLowerCase().includes(q) || r.eleve.nom.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.charger();
    this.api
      .creneauxDuJour(new Date().toISOString().slice(0, 10))
      .subscribe({ next: (c) => this.creneaux.set(c), error: () => undefined });
    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.direct() && this.charger());
  }

  charger(): void {
    this.api.commandes({}).subscribe({
      next: (d) => {
        this.donnees.set(d);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
  }

  risque(r: Reservation, code: string): boolean {
    return r.alertesAllergie.some((a) => a.code === code);
  }

  reinitialiser(): void {
    this.recherche.set('');
    this.creneauId.set('');
    this.statut.set('');
    this.seulementRisque.set(false);
  }
}
