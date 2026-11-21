import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CantineApi,
  CATEGORIES,
  ItemMenu,
  JourMenu,
  Plat,
  Semaine,
} from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { PhotoPlatComponent } from '../../shared/components/ui/photo-plat/photo-plat.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';

const libelleCategorie = (c: string) => CATEGORIES.find((x) => x.code === c)?.libelle ?? c;

function decaler(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    PhotoPlatComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Menus de la semaine</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          5 créneaux × 40 couverts · portions à préparer = réservés × (1 − taux d'absence) + 5 %
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          (click)="changerSemaine(-7)"
          class="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
          aria-label="Semaine précédente"
        >
          <i class="pi pi-chevron-left text-sm"></i>
        </button>
        <span class="text-sm font-semibold text-gray-700 min-w-44 text-center">
          @if (semaine(); as s) {
            Semaine du {{ s.lundi | date: 'd MMMM' }}
          } @else {
            …
          }
        </span>
        <button
          type="button"
          (click)="changerSemaine(7)"
          class="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
          aria-label="Semaine suivante"
        >
          <i class="pi pi-chevron-right text-sm"></i>
        </button>
      </div>
    </div>

    @if (semaine(); as s) {
      <div class="space-y-4">
        @for (j of s.jours; track j.date) {
          <app-card>
            <div class="flex flex-wrap items-center gap-3 mb-3">
              <h2 class="text-base font-bold text-gray-800 capitalize">
                {{ j.date | date: 'EEEE d MMMM' }}
              </h2>
              @if (j.date === aujourdhui) {
                <app-badge color="info">Aujourd'hui</app-badge>
              }
              <app-badge [color]="j.publie ? 'success' : 'warning'">{{
                j.publie ? 'Publié' : 'Brouillon'
              }}</app-badge>
              <span class="text-xs text-gray-500"
                >{{ j.items.length }} plats · {{ total(j) }} portions prévues</span
              >
              <div class="ml-auto flex gap-2">
                <button
                  type="button"
                  (click)="ouvrirAjout(j)"
                  class="px-3 py-1.5 rounded-lg border border-vatel-primary text-vatel-primary text-sm font-semibold hover:bg-[#e7f3fc]"
                >
                  <i class="pi pi-plus text-xs mr-1"></i>Ajouter un plat
                </button>
                @if (j.items.length) {
                  <button
                    type="button"
                    [disabled]="occupe()"
                    (click)="basculerPublication(j)"
                    class="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    [class]="
                      j.publie
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-vatel-primary text-white hover:bg-vatel-primary-dark'
                    "
                  >
                    {{ j.publie ? 'Dépublier' : 'Publier' }}
                  </button>
                }
              </div>
            </div>

            @if (j.items.length) {
              <ul class="divide-y divide-gray-100">
                @for (i of j.items; track i.id) {
                  <li class="flex items-center gap-3 py-2.5">
                    <app-photo-plat [url]="i.plat.photoUrl" [nom]="i.plat.nom" [taille]="44" />
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-800 truncate">{{ i.plat.nom }}</p>
                      <p class="text-xs text-gray-500">
                        {{ cat(i.plat.categorie) }}
                        @for (a of i.plat.allergenes; track a.code) {
                          · {{ a.nom }}
                        }
                      </p>
                    </div>
                    <span class="text-sm text-gray-600 w-28 text-right"
                      >{{ i.portionsPrevues ?? '—' }} portions</span
                    >
                    <span class="text-sm font-semibold text-gray-800 w-24 text-right"
                      >{{ i.plat.prix }} FCFA</span
                    >
                    <button
                      type="button"
                      (click)="retirer(j, i)"
                      class="text-gray-400 hover:text-error p-1"
                      aria-label="Retirer du menu"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-sm text-gray-500 py-4 text-center">
                Pas encore de menu pour ce jour : ajoutez un premier plat.
              </p>
            }
          </app-card>
        }
      </div>
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
      <div class="space-y-4">
        @for (i of [1, 2, 3]; track i) {
          <app-skeleton height="140px" radius="12px" />
        }
      </div>
    }

    <!-- Modale : ajouter un plat au jour -->
    @if (jourAjout(); as j) {
      <div
        class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        (click)="jourAjout.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
        >
          <h3 class="text-lg font-bold text-gray-800 mb-1">Ajouter un plat</h3>
          <p class="text-sm text-gray-500 mb-4 capitalize">{{ j.date | date: 'EEEE d MMMM' }}</p>

          <label class="block text-sm font-semibold text-gray-700 mb-1" for="plat-choisi"
            >Plat</label
          >
          <select
            id="plat-choisi"
            [ngModel]="platChoisi()"
            (ngModelChange)="platChoisi.set($event)"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 bg-white"
          >
            <option value="">Choisir dans le catalogue…</option>
            @for (c of categories; track c.code) {
              <optgroup [label]="c.libelle">
                @for (p of disponibles(j, c.code); track p.id) {
                  <option [value]="p.id">{{ p.nom }} — {{ p.prix }} FCFA</option>
                }
              </optgroup>
            }
          </select>

          <label class="block text-sm font-semibold text-gray-700 mb-1" for="portions"
            >Portions prévues</label
          >
          <input
            id="portions"
            type="number"
            min="1"
            [ngModel]="portions()"
            (ngModelChange)="portions.set($event)"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6"
          />

          <div class="flex justify-end gap-2">
            <button
              type="button"
              (click)="jourAjout.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="!platChoisi() || occupe()"
              (click)="ajouter(j)"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold disabled:opacity-50"
            >
              Ajouter au menu
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MenusComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);

  readonly categories = CATEGORIES;
  readonly cat = libelleCategorie;
  aujourdhui = new Date().toISOString().slice(0, 10);

  semaine = signal<Semaine | null>(null);
  catalogue = signal<Plat[]>([]);
  erreur = signal('');
  occupe = signal(false);
  jourAjout = signal<JourMenu | null>(null);
  platChoisi = signal('');
  portions = signal<number | null>(40);

  private debut: string | undefined;
  total(j: JourMenu): number {
    return j.items.reduce((s, i) => s + (i.portionsPrevues ?? 0), 0);
  }

  ngOnInit(): void {
    this.charger();
    this.api
      .plats({ limit: 100 })
      .subscribe({ next: (r) => this.catalogue.set(r.plats), error: () => undefined });
  }

  charger(): void {
    this.api.semaine(this.debut).subscribe({
      next: (s) => {
        this.semaine.set(s);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
  }

  changerSemaine(n: number): void {
    const lundi = this.semaine()?.lundi;
    if (!lundi) return;
    this.debut = decaler(lundi, n);
    this.semaine.set(null);
    this.charger();
  }

  disponibles(j: JourMenu, categorie: string): Plat[] {
    const deja = new Set(j.items.map((i) => i.plat.id));
    return this.catalogue().filter((p) => p.actif && p.categorie === categorie && !deja.has(p.id));
  }

  ouvrirAjout(j: JourMenu): void {
    this.platChoisi.set('');
    this.portions.set(40);
    this.jourAjout.set(j);
  }

  ajouter(j: JourMenu): void {
    const items = [
      ...j.items.map((i) => ({
        platId: i.plat.id,
        portionsPrevues: i.portionsPrevues ?? undefined,
      })),
      { platId: this.platChoisi(), portionsPrevues: this.portions() ?? undefined },
    ];
    this.enregistrer(j.date, items, 'Plat ajouté au menu.');
    this.jourAjout.set(null);
  }

  retirer(j: JourMenu, i: ItemMenu): void {
    const items = j.items
      .filter((x) => x.id !== i.id)
      .map((x) => ({ platId: x.plat.id, portionsPrevues: x.portionsPrevues ?? undefined }));
    this.enregistrer(j.date, items, 'Plat retiré du menu.');
  }

  basculerPublication(j: JourMenu): void {
    this.occupe.set(true);
    this.api.publier(j.date, !j.publie).subscribe({
      next: () => {
        this.toast.success(
          j.publie ? 'Menu dépublié.' : 'Menu publié : les élèves peuvent réserver.',
        );
        this.occupe.set(false);
        this.charger();
      },
      error: () => this.occupe.set(false),
    });
  }

  private enregistrer(
    date: string,
    items: { platId: string; portionsPrevues?: number }[],
    message: string,
  ): void {
    this.occupe.set(true);
    this.api.composer(date, items).subscribe({
      next: () => {
        this.toast.success(message);
        this.occupe.set(false);
        this.charger();
      },
      error: () => this.occupe.set(false),
    });
  }
}
