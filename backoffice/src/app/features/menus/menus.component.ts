import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  Allergene,
  CantineApi,
  CATEGORIES,
  Categorie,
  ItemMenu,
  JourMenu,
  Plat,
  Semaine,
} from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';

const PHOTOS = 'https://cantine-vatel-backoffice.vercel.app/plats/';
const libelleCategorie = (c: string) => CATEGORIES.find((x) => x.code === c)?.libelle ?? c;

function decaler(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Le formulaire de la modale « plat du jour » (ajout ou modification). */
interface Forme {
  itemId: string | null;
  platId: string | null;
  nom: string;
  categorie: Categorie;
  prix: number | null;
  poids: number | null;
  photo: string;
  description: string;
  vegetarien: boolean;
  allergenes: string[];
  portions: number | null;
}

const FORME_VIDE: Forme = {
  itemId: null,
  platId: null,
  nom: '',
  categorie: 'PLAT',
  prix: null,
  poids: null,
  photo: '',
  description: '',
  vegetarien: false,
  allergenes: [],
  portions: 40,
};

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  template: `
    <!-- ─── En-tête ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-800">Menus de la semaine</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          Planifiez les plats, les prix et les portions. Un menu publié devient visible et
          réservable dans l'appli mobile.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1 py-1">
          <button
            type="button"
            (click)="changerSemaine(-7)"
            class="w-8 h-8 rounded-md hover:bg-gray-100"
            aria-label="Semaine précédente"
          >
            <i class="pi pi-chevron-left text-xs" aria-hidden="true"></i>
          </button>
          <span class="text-sm font-semibold text-gray-700 px-2 min-w-40 text-center">
            @if (semaine(); as s) {
              Semaine du {{ s.lundi | date: 'd MMMM' }}
            } @else {
              …
            }
          </span>
          <button
            type="button"
            (click)="changerSemaine(7)"
            class="w-8 h-8 rounded-md hover:bg-gray-100"
            aria-label="Semaine suivante"
          >
            <i class="pi pi-chevron-right text-xs" aria-hidden="true"></i>
          </button>
        </div>
        <a
          routerLink="/plats"
          class="px-3.5 py-2 rounded-lg border border-vatel-primary text-vatel-primary text-sm font-semibold hover:bg-[#e7f3fc]"
        >
          <i class="pi pi-book mr-1.5" aria-hidden="true"></i>Catalogue
        </a>
        <button
          type="button"
          [disabled]="aPublier().length === 0 || occupe()"
          (click)="confirmation.set({ jours: aPublier() })"
          class="px-3.5 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
        >
          <i class="pi pi-send mr-1.5" aria-hidden="true"></i
          >{{ aPublier().length ? 'Publier la semaine' : 'Semaine publiée' }}
        </button>
      </div>
    </div>

    @if (semaine(); as s) {
      @if (vide()) {
        <app-card>
          <app-empty-state
            icon="pi-calendar-plus"
            [title]="'Aucun menu pour la semaine du ' + (s.lundi | date: 'd MMMM')"
            message="Les élèves ne voient encore rien pour cette semaine. Partez du menu de la semaine précédente ou composez-le plat par plat."
            actionLabel="Dupliquer la semaine précédente"
            (action)="dupliquer()"
          />
          <div class="text-center pb-6">
            <button
              type="button"
              (click)="ouvrirAjout(s.jours[0])"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark"
            >
              <i class="pi pi-plus mr-1.5" aria-hidden="true"></i>Créer le menu
            </button>
          </div>
        </app-card>
      } @else {
        <div class="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-success font-semibold px-3 py-1"
          >
            <i class="pi pi-check text-xs" aria-hidden="true"></i>{{ publies() }} jours publiés
          </span>
          @if (brouillons()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-warning font-semibold px-3 py-1"
            >
              <i class="pi pi-pencil text-xs" aria-hidden="true"></i>{{ brouillons() }} brouillon(s)
            </span>
          }
          <span class="rounded-full bg-gray-100 text-gray-600 px-3 py-1"
            >5 créneaux × 40 couverts par jour</span
          >
          <span class="text-gray-500 text-xs"
            >Portions prévues = réservations × (1 − taux d'absence) + 5 % de marge</span
          >
        </div>

        <div class="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
          @for (j of s.jours; track j.date) {
            <section
              class="bg-white rounded-xl shadow-sm border flex flex-col min-w-0"
              [class]="
                j.date === aujourdhui
                  ? 'border-vatel-primary ring-1 ring-vatel-primary/30'
                  : 'border-gray-100'
              "
              [attr.aria-label]="j.date"
            >
              <div
                class="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-gray-100"
              >
                <div>
                  <p class="font-bold text-gray-800 capitalize">{{ j.date | date: 'EEEE' }}</p>
                  <p class="text-xs text-gray-500">{{ j.date | date: 'd MMMM' }}</p>
                </div>
                <span
                  class="text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
                  [class]="etat(j).classe"
                >
                  <i class="pi {{ etat(j).icone }} text-[10px] mr-1" aria-hidden="true"></i
                  >{{ etat(j).libelle }}
                </span>
              </div>

              <div class="px-3 py-3 flex-1 space-y-2.5">
                @if (j.items.length && !j.publie) {
                  <p class="flex gap-2 text-xs text-warning bg-amber-50 rounded-lg px-2.5 py-2">
                    <i class="pi pi-eye-slash mt-0.5" aria-hidden="true"></i>
                    <span
                      ><strong>Menu non publié</strong> : invisible pour les élèves, aucune
                      réservation possible.</span
                    >
                  </p>
                }
                @for (i of j.items; track i.id) {
                  <article class="rounded-lg border border-gray-100 bg-[#f9fbfd] px-3 py-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                          {{ cat(i.plat.categorie) }}
                        </p>
                        <p class="font-semibold text-gray-800 leading-snug">{{ i.plat.nom }}</p>
                      </div>
                      @if (modifiable(j)) {
                        <button
                          type="button"
                          (click)="ouvrirEdition(j, i)"
                          class="w-7 h-7 rounded-md text-gray-400 hover:text-vatel-primary hover:bg-white shrink-0"
                          [attr.aria-label]="'Modifier ' + i.plat.nom"
                        >
                          <i class="pi pi-pencil text-xs" aria-hidden="true"></i>
                        </button>
                      }
                    </div>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      @for (a of i.plat.allergenes; track a.code) {
                        <span
                          class="text-[11px] rounded-full px-2 py-0.5 font-medium"
                          [class]="
                            a.code === 'ARACHIDES'
                              ? 'bg-red-50 text-error'
                              : 'bg-gray-100 text-gray-600'
                          "
                          >{{ a.nom }}</span
                        >
                      } @empty {
                        <span
                          class="text-[11px] rounded-full px-2 py-0.5 bg-green-50 text-success font-medium"
                          >Sans allergène</span
                        >
                      }
                    </div>
                    <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span class="font-bold text-vatel-primary-dark text-sm"
                        >{{ i.plat.prix }} FCFA</span
                      >
                      <span>{{ i.portionsPrevues ?? '—' }} portions</span>
                    </div>
                  </article>
                }
                @if (modifiable(j)) {
                  <button
                    type="button"
                    (click)="ouvrirAjout(j)"
                    class="w-full rounded-lg border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold py-2.5 hover:border-vatel-primary hover:text-vatel-primary"
                  >
                    <i class="pi pi-plus text-xs mr-1.5" aria-hidden="true"></i>Ajouter un plat
                  </button>
                }
              </div>

              <div
                class="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-xs text-gray-500"
              >
                <span>{{ j.items.length }} plats · {{ total(j) }} portions</span>
                @if (j.items.length && !j.publie && modifiable(j)) {
                  <button
                    type="button"
                    (click)="confirmation.set({ jours: [j] })"
                    class="px-3 py-1.5 rounded-lg bg-vatel-primary text-white text-xs font-semibold hover:bg-vatel-primary-dark"
                  >
                    <i class="pi pi-send mr-1" aria-hidden="true"></i>Publier
                  </button>
                } @else if (j.publie && modifiable(j)) {
                  <button
                    type="button"
                    (click)="depublier(j)"
                    class="text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Dépublier
                  </button>
                }
              </div>
            </section>
          }
        </div>
      }
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
      <div class="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <app-skeleton height="360px" radius="12px" />
        }
      </div>
    }

    <!-- ─── Modale : ajouter / modifier un plat du jour ─────────── -->
    @if (forme(); as f) {
      <div
        class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
        (click)="forme.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-6"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="m-titre"
        >
          <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <h3 id="m-titre" class="text-lg font-bold text-gray-800">
              {{ f.itemId ? 'Modifier le plat' : 'Ajouter un plat' }}
            </h3>
            <button
              type="button"
              (click)="forme.set(null)"
              class="w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Fermer"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="px-6 py-4 space-y-4">
            <p
              class="flex items-center gap-2 text-sm bg-[#e7f3fc] text-vatel-primary-dark rounded-lg px-3 py-2"
            >
              <i class="pi pi-calendar" aria-hidden="true"></i
              ><span
                >Menu du <strong>{{ jourModale() | date: 'EEEE d MMMM' }}</strong></span
              >
            </p>

            @if (!f.itemId) {
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-existant"
                  >Reprendre un plat du catalogue</label
                >
                <select
                  id="f-existant"
                  [ngModel]="f.platId ?? ''"
                  (ngModelChange)="choisirExistant($event)"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">— Nouveau plat —</option>
                  @for (p of disponibles(); track p.id) {
                    <option [value]="p.id">
                      {{ p.nom }} · {{ cat(p.categorie) }} · {{ p.prix }} FCFA
                    </option>
                  }
                </select>
              </div>
            }

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-nom"
                >Nom du plat</label
              >
              <input
                id="f-nom"
                [(ngModel)]="f.nom"
                placeholder="Ex. Foutou sauce graine"
                [attr.aria-invalid]="nomErreur()"
                class="w-full border rounded-lg px-3 py-2"
                [class]="nomErreur() ? 'border-error' : 'border-gray-300'"
              />
              @if (nomErreur()) {
                <span class="text-xs text-error mt-1 block"
                  ><i class="pi pi-exclamation-circle mr-1" aria-hidden="true"></i>Le nom du plat
                  est obligatoire.</span
                >
              }
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-cat"
                  >Catégorie</label
                >
                <select
                  id="f-cat"
                  [(ngModel)]="f.categorie"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  @for (c of categories; track c.code) {
                    <option [value]="c.code">{{ c.libelle }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-prix"
                  >Prix (FCFA)</label
                >
                <input
                  id="f-prix"
                  type="number"
                  min="0"
                  [(ngModel)]="f.prix"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-poids"
                  >Poids portion (g)</label
                >
                <input
                  id="f-poids"
                  type="number"
                  min="0"
                  [(ngModel)]="f.poids"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-photo"
                >Photo</label
              >
              <div
                class="flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2.5"
              >
                <i class="pi pi-image text-gray-400" aria-hidden="true"></i>
                <input
                  id="f-photo"
                  [(ngModel)]="f.photo"
                  placeholder="Nom du fichier placé dans backoffice/public/plats/ (ex. garba.jpg)"
                  class="flex-1 text-sm outline-none bg-transparent"
                />
              </div>
            </div>
            <fieldset>
              <legend class="block text-sm font-semibold text-gray-700 mb-1">
                Allergènes présents
              </legend>
              <div class="flex flex-wrap gap-2">
                @for (a of allergenes(); track a.code) {
                  <label
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm cursor-pointer"
                    [class]="
                      f.allergenes.includes(a.code)
                        ? 'border-vatel-primary bg-[#e7f3fc] text-vatel-primary-dark font-semibold'
                        : 'border-gray-200 text-gray-600'
                    "
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      [checked]="f.allergenes.includes(a.code)"
                      (change)="cocher(f, a.code)"
                    />{{ a.nom }}
                  </label>
                }
              </div>
              <span class="text-xs text-gray-500 mt-1 block"
                >L'alerte allergie au comptoir compare ces allergènes au profil de chaque
                élève.</span
              >
            </fieldset>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-port"
                  >Portions prévues</label
                >
                <input
                  id="f-port"
                  type="number"
                  min="1"
                  [(ngModel)]="f.portions"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              @if (suggestion() !== null) {
                <p
                  class="flex items-center gap-2 text-sm bg-green-50 text-success rounded-lg px-3 py-2"
                >
                  <i class="pi pi-lightbulb" aria-hidden="true"></i>
                  <span
                    >Suggestion anti-gaspi : <strong>{{ suggestion() }} portions</strong></span
                  >
                  <button
                    type="button"
                    class="ml-auto underline font-semibold"
                    (click)="f.portions = suggestion()"
                  >
                    Appliquer
                  </button>
                </p>
              }
            </div>
            <label class="flex items-center gap-2 text-sm"
              ><input type="checkbox" [(ngModel)]="f.vegetarien" />Plat végétarien</label
            >
          </div>
          <div class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-gray-100">
            @if (f.itemId) {
              <button
                type="button"
                (click)="retirer()"
                class="mr-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                <i class="pi pi-trash mr-1.5" aria-hidden="true"></i>Retirer du menu
              </button>
            }
            <button
              type="button"
              (click)="forme.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="occupe()"
              (click)="enregistrer()"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              <i class="pi pi-check mr-1.5" aria-hidden="true"></i>Enregistrer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── Modale : confirmer la publication ───────────────────── -->
    @if (confirmation(); as c) {
      <div
        class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        (click)="confirmation.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="c-titre"
        >
          <span
            class="w-14 h-14 rounded-full bg-[#e7f3fc] text-vatel-primary inline-flex items-center justify-center mb-3"
            ><i class="pi pi-send text-xl" aria-hidden="true"></i
          ></span>
          <h3 id="c-titre" class="text-lg font-bold text-gray-800">
            @if (c.jours.length === 1) {
              Publier le menu du {{ c.jours[0].date | date: 'EEEE d MMMM' }} ?
            } @else {
              Publier {{ c.jours.length }} menus ?
            }
          </h3>
          <p class="text-sm text-gray-500 mt-2">
            Les élèves pourront réserver un créneau pour
            {{ c.jours.length === 1 ? 'ce jour' : 'ces jours' }} dans l'appli mobile.
          </p>
          <div class="flex justify-center gap-2 mt-5">
            <button
              type="button"
              (click)="confirmation.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="occupe()"
              (click)="publier(c.jours)"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              <i class="pi pi-send mr-1.5" aria-hidden="true"></i>Publier
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
  allergenes = signal<Allergene[]>([]);
  erreur = signal('');
  occupe = signal(false);
  forme = signal<Forme | null>(null);
  jourModale = signal('');
  nomErreur = signal(false);
  suggestion = signal<number | null>(null);
  confirmation = signal<{ jours: JourMenu[] } | null>(null);

  private debut: string | undefined;

  publies = computed(
    () => this.semaine()?.jours.filter((j) => j.publie && j.items.length).length ?? 0,
  );
  brouillons = computed(
    () => this.semaine()?.jours.filter((j) => !j.publie && j.items.length).length ?? 0,
  );
  vide = computed(
    () => !!this.semaine() && this.semaine()!.jours.every((j) => j.items.length === 0),
  );
  aPublier = computed(() =>
    (this.semaine()?.jours ?? []).filter(
      (j) => j.items.length && !j.publie && j.date >= this.aujourdhui,
    ),
  );
  disponibles = computed(() => {
    const deja = new Set(this.jourCourant()?.items.map((i) => i.plat.id) ?? []);
    return this.catalogue().filter((p) => p.actif && !deja.has(p.id));
  });

  ngOnInit(): void {
    this.charger();
    this.api
      .plats({ limit: 100 })
      .subscribe({ next: (r) => this.catalogue.set(r.plats), error: () => undefined });
    this.api
      .allergenes()
      .subscribe({ next: (a) => this.allergenes.set(a), error: () => undefined });
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

  total(j: JourMenu): number {
    return j.items.reduce((s, i) => s + (i.portionsPrevues ?? 0), 0);
  }

  /** Un jour passé n'est plus modifiable. */
  modifiable(j: JourMenu): boolean {
    return j.date >= this.aujourdhui;
  }

  etat(j: JourMenu): { libelle: string; classe: string; icone: string } {
    if (j.date < this.aujourdhui)
      return { libelle: 'Passé', classe: 'bg-gray-100 text-gray-500', icone: 'pi-history' };
    if (!j.items.length)
      return { libelle: 'Vide', classe: 'bg-gray-100 text-gray-500', icone: 'pi-minus' };
    if (!j.publie)
      return { libelle: 'Brouillon', classe: 'bg-amber-50 text-warning', icone: 'pi-pencil' };
    if (j.date === this.aujourdhui)
      return {
        libelle: "Aujourd'hui",
        classe: 'bg-[#e7f3fc] text-vatel-primary-dark',
        icone: 'pi-sun',
      };
    return { libelle: 'Publié', classe: 'bg-green-50 text-success', icone: 'pi-check' };
  }

  private jourCourant(): JourMenu | undefined {
    return this.semaine()?.jours.find((j) => j.date === this.jourModale());
  }

  // ─── Modale plat ──────────────────────────────────────────────

  ouvrirAjout(j: JourMenu): void {
    this.nomErreur.set(false);
    this.suggestion.set(null);
    this.jourModale.set(j.date);
    this.forme.set({ ...FORME_VIDE, allergenes: [] });
  }

  ouvrirEdition(j: JourMenu, i: ItemMenu): void {
    const p = i.plat;
    this.nomErreur.set(false);
    this.suggestion.set(null);
    this.jourModale.set(j.date);
    this.forme.set({
      itemId: i.id,
      platId: p.id,
      nom: p.nom,
      categorie: p.categorie,
      prix: p.prix,
      poids: p.poidsPortionG,
      photo: p.photoUrl?.startsWith(PHOTOS) ? p.photoUrl.slice(PHOTOS.length) : (p.photoUrl ?? ''),
      description: p.description ?? '',
      vegetarien: p.vegetarien,
      allergenes: p.allergenes.map((a) => a.code),
      portions: i.portionsPrevues,
    });
    // Suggestion anti-gaspi : la prévision du jour pour ce plat.
    this.api.prevision(j.date).subscribe({
      next: (pr) =>
        this.suggestion.set(pr.plats.find((l) => l.menuItemId === i.id)?.aPreparer ?? null),
      error: () => undefined,
    });
  }

  choisirExistant(id: string): void {
    const f = this.forme();
    if (!f) return;
    const p = this.catalogue().find((x) => x.id === id);
    if (!p) {
      this.forme.set({ ...FORME_VIDE, allergenes: [], portions: f.portions });
      return;
    }
    this.forme.set({
      ...f,
      platId: p.id,
      nom: p.nom,
      categorie: p.categorie,
      prix: p.prix,
      poids: p.poidsPortionG,
      photo: p.photoUrl?.startsWith(PHOTOS) ? p.photoUrl.slice(PHOTOS.length) : (p.photoUrl ?? ''),
      description: p.description ?? '',
      vegetarien: p.vegetarien,
      allergenes: p.allergenes.map((a) => a.code),
    });
  }

  cocher(f: Forme, code: string): void {
    f.allergenes = f.allergenes.includes(code)
      ? f.allergenes.filter((c) => c !== code)
      : [...f.allergenes, code];
  }

  async enregistrer(): Promise<void> {
    const f = this.forme();
    const j = this.jourCourant();
    if (!f || !j) return;
    if (f.nom.trim().length < 2 || f.prix === null || Number(f.prix) < 0) {
      this.nomErreur.set(f.nom.trim().length < 2);
      if (f.prix === null) this.toast.error('Indiquez le prix du plat.');
      return;
    }
    const photo = f.photo.trim();
    const corps = {
      nom: f.nom.trim(),
      categorie: f.categorie,
      prix: Number(f.prix),
      description: f.description.trim() || undefined,
      poidsPortionG: f.poids ? Number(f.poids) : undefined,
      vegetarien: f.vegetarien,
      photoUrl: photo ? (photo.startsWith('http') ? photo : PHOTOS + photo) : undefined,
      allergenes: f.allergenes,
    };
    this.occupe.set(true);
    try {
      const platId = f.platId
        ? (await lastValueFrom(this.api.modifierPlat(f.platId, corps))).data.id
        : (await lastValueFrom(this.api.creerPlat(corps))).data.id;
      const autres = j.items
        .filter((x) => x.id !== f.itemId)
        .map((x) => ({ platId: x.plat.id, portionsPrevues: x.portionsPrevues ?? undefined }));
      await lastValueFrom(
        this.api.composer(j.date, [
          ...autres,
          { platId, portionsPrevues: f.portions ?? undefined },
        ]),
      );
      this.toast.success(f.itemId ? 'Plat modifié.' : 'Plat ajouté au menu.');
      this.forme.set(null);
      this.charger();
      this.api.plats({ limit: 100 }).subscribe({ next: (r) => this.catalogue.set(r.plats) });
    } catch {
      /* le message d'erreur de l'API est déjà affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  async retirer(): Promise<void> {
    const f = this.forme();
    const j = this.jourCourant();
    if (!f || !j) return;
    this.occupe.set(true);
    try {
      const reste = j.items
        .filter((x) => x.id !== f.itemId)
        .map((x) => ({ platId: x.plat.id, portionsPrevues: x.portionsPrevues ?? undefined }));
      await lastValueFrom(this.api.composer(j.date, reste));
      this.toast.success('Plat retiré du menu.');
      this.forme.set(null);
      this.charger();
    } catch {
      /* erreur affichée par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  // ─── Publication ──────────────────────────────────────────────

  async publier(jours: JourMenu[]): Promise<void> {
    this.occupe.set(true);
    try {
      for (const j of jours) await lastValueFrom(this.api.publier(j.date, true));
      this.toast.success(
        jours.length === 1 ? 'Menu publié : les élèves peuvent réserver.' : 'Menus publiés.',
      );
      this.confirmation.set(null);
      this.charger();
    } catch {
      /* erreur affichée par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  async depublier(j: JourMenu): Promise<void> {
    this.occupe.set(true);
    try {
      await lastValueFrom(this.api.publier(j.date, false));
      this.toast.success('Menu dépublié.');
      this.charger();
    } catch {
      /* erreur affichée par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  /** Recopie, jour par jour, le menu de la semaine précédente (en brouillon). */
  async dupliquer(): Promise<void> {
    const s = this.semaine();
    if (!s) return;
    this.occupe.set(true);
    try {
      const precedente = await lastValueFrom(this.api.semaine(decaler(s.lundi, -7)));
      let copies = 0;
      for (const [i, j] of precedente.jours.entries()) {
        const cible = s.jours[i];
        if (!j.items.length || !cible || cible.date < this.aujourdhui) continue;
        await lastValueFrom(
          this.api.composer(
            cible.date,
            j.items.map((x) => ({
              platId: x.plat.id,
              portionsPrevues: x.portionsPrevues ?? undefined,
            })),
          ),
        );
        copies++;
      }
      if (copies)
        this.toast.success(`${copies} jours copiés en brouillon : vérifiez puis publiez.`);
      else this.toast.error('La semaine précédente est vide : il n’y a rien à copier.');
      this.charger();
    } catch {
      /* erreur affichée par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }
}
