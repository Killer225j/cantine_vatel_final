import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Allergene,
  CantineApi,
  CATEGORIES,
  Categorie,
  FormulairePlat,
  Plat,
} from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { PhotoPlatComponent } from '../../shared/components/ui/photo-plat/photo-plat.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';

const PHOTOS = 'https://cantine-vatel-backoffice.vercel.app/plats/';

interface Brouillon {
  id: string | null;
  nom: string;
  categorie: Categorie;
  prix: number | null;
  poidsPortionG: number | null;
  description: string;
  photo: string;
  vegetarien: boolean;
  allergenes: string[];
}

const VIDE: Brouillon = {
  id: null,
  nom: '',
  categorie: 'PLAT',
  prix: null,
  poidsPortionG: null,
  description: '',
  photo: '',
  vegetarien: false,
  allergenes: [],
};

@Component({
  selector: 'app-plats',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    StatTileComponent,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    PhotoPlatComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-800">Catalogue des plats</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          Tous les plats utilisables dans les menus, avec leurs allergènes et la note donnée par les
          élèves.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a
          routerLink="/menus"
          class="px-3.5 py-2 rounded-lg border border-vatel-primary text-vatel-primary text-sm font-semibold hover:bg-[#e7f3fc]"
        >
          <i class="pi pi-calendar mr-1.5" aria-hidden="true"></i>Menus de la semaine
        </a>
        <button
          type="button"
          (click)="nouveau()"
          class="px-3.5 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark"
        >
          <i class="pi pi-plus mr-1.5" aria-hidden="true"></i>Nouveau plat
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      @for (t of tuiles(); track t.label) {
        <div class="flex flex-col">
          <app-stat-tile [value]="t.valeur" [label]="t.label" [icon]="t.icone" />
          <span class="text-[11px] text-gray-500 mt-1.5 px-1">{{ t.detail }}</span>
        </div>
      }
    </div>

    <app-card>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <div class="relative">
          <i
            class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            aria-hidden="true"
          ></i>
          <input
            type="search"
            placeholder="Rechercher un plat…"
            aria-label="Rechercher un plat"
            [ngModel]="recherche()"
            (ngModelChange)="recherche.set($event)"
            class="border border-gray-300 rounded-full pl-9 pr-3 py-2 text-sm w-64 focus:outline-none focus:border-vatel-primary"
          />
        </div>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Catégorie">
          @for (c of filtresCategorie(); track c.code) {
            <button
              type="button"
              (click)="filtreCategorie.set(c.code)"
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold"
              [class]="
                filtreCategorie() === c.code
                  ? 'bg-vatel-primary border-vatel-primary text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              "
              [attr.aria-pressed]="filtreCategorie() === c.code"
            >
              {{ c.libelle }}
              <span
                class="text-[11px] rounded-full px-1.5"
                [class]="filtreCategorie() === c.code ? 'bg-white/25' : 'bg-gray-100'"
                >{{ c.n }}</span
              >
            </button>
          }
        </div>
        <label class="ml-auto flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            [ngModel]="seulementArachide()"
            (ngModelChange)="seulementArachide.set($event)"
          />
          Avec arachide uniquement
        </label>
      </div>

      @if (!chargement()) {
        @if (visibles().length) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th class="py-2 pr-3 font-semibold">Plat</th>
                  <th class="py-2 pr-3 font-semibold">Catégorie</th>
                  <th class="py-2 pr-3 font-semibold text-right">Prix</th>
                  <th class="py-2 pr-3 font-semibold">Allergènes</th>
                  <th class="py-2 pr-3 font-semibold">Note</th>
                  <th class="py-2 pr-3 font-semibold">Statut</th>
                  <th class="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                @for (p of visibles(); track p.id) {
                  <tr class="border-b border-gray-100" [class.opacity-60]="!p.actif">
                    <td class="py-2.5 pr-3">
                      <div class="flex items-center gap-3">
                        <app-photo-plat [url]="p.photoUrl" [nom]="p.nom" [taille]="40" />
                        <div>
                          <p class="font-semibold text-gray-800">{{ p.nom }}</p>
                          <p class="text-xs text-gray-500">
                            {{ p.poidsPortionG ? p.poidsPortionG + ' g' : '—'
                            }}{{ p.vegetarien ? ' · végétarien' : '' }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="py-2.5 pr-3">{{ cat(p.categorie) }}</td>
                    <td class="py-2.5 pr-3 text-right font-semibold">{{ p.prix }} FCFA</td>
                    <td class="py-2.5 pr-3">
                      @for (a of p.allergenes; track a.code) {
                        <app-badge [color]="a.code === 'ARACHIDES' ? 'error' : 'neutral'">{{
                          a.nom
                        }}</app-badge>
                      } @empty {
                        <span class="text-gray-400">—</span>
                      }
                    </td>
                    <td class="py-2.5 pr-3">
                      @if (p.noteMoyenne !== null) {
                        <span class="text-amber-400 tracking-tight" aria-hidden="true">{{
                          etoiles(p.noteMoyenne)
                        }}</span>
                        <span class="font-semibold ml-1">{{ p.noteMoyenne }}</span>
                        <span class="text-xs text-gray-500">({{ p.nbAvis }} avis)</span>
                      } @else {
                        <span class="text-gray-400">—</span>
                      }
                    </td>
                    <td class="py-2.5 pr-3">
                      <app-badge [color]="p.actif ? 'success' : 'neutral'">{{
                        p.actif ? 'Actif' : 'Désactivé'
                      }}</app-badge>
                    </td>
                    <td class="py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        (click)="modifier(p)"
                        class="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:text-vatel-primary hover:border-vatel-primary mr-1.5"
                        [attr.aria-label]="'Modifier ' + p.nom"
                        title="Modifier"
                      >
                        <i class="pi pi-pencil text-xs" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        (click)="basculerActif(p)"
                        class="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:text-error hover:border-error"
                        [attr.aria-label]="(p.actif ? 'Désactiver ' : 'Réactiver ') + p.nom"
                        [title]="p.actif ? 'Désactiver' : 'Réactiver'"
                      >
                        <i
                          class="pi text-xs"
                          [class]="p.actif ? 'pi-ban' : 'pi-replay'"
                          aria-hidden="true"
                        ></i>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="pi-search"
            title="Aucun plat"
            message="Aucun plat ne correspond à ces filtres."
            actionLabel="Effacer les filtres"
            (action)="effacer()"
          />
        }
      } @else {
        <app-skeleton height="260px" radius="12px" />
      }
    </app-card>

    @if (brouillon(); as b) {
      <div
        class="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-3"
        (click)="brouillon.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
        >
          <h3 class="text-lg font-bold text-gray-800 mb-4">
            {{ b.id ? 'Modifier le plat' : 'Nouveau plat' }}
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-nom"
                >Nom *</label
              >
              <input
                id="f-nom"
                [(ngModel)]="b.nom"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-cat"
                >Catégorie</label
              >
              <select
                id="f-cat"
                [(ngModel)]="b.categorie"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                @for (c of categories; track c.code) {
                  <option [value]="c.code">{{ c.libelle }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-prix"
                >Prix (FCFA) *</label
              >
              <input
                id="f-prix"
                type="number"
                min="0"
                [(ngModel)]="b.prix"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-poids"
                >Poids de la portion (g)</label
              >
              <input
                id="f-poids"
                type="number"
                min="0"
                [(ngModel)]="b.poidsPortionG"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-photo"
                >Photo (nom du fichier)</label
              >
              <input
                id="f-photo"
                [(ngModel)]="b.photo"
                placeholder="garba.jpg"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="f-desc"
                >Description</label
              >
              <textarea
                id="f-desc"
                rows="2"
                [(ngModel)]="b.description"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              ></textarea>
            </div>
            <div class="col-span-2">
              <p class="text-sm font-semibold text-gray-700 mb-1">Allergènes</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                @for (a of allergenes(); track a.code) {
                  <label class="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      [checked]="b.allergenes.includes(a.code)"
                      (change)="cocher(b, a.code)"
                    />{{ a.nom }}
                  </label>
                }
              </div>
            </div>
            <label class="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="b.vegetarien" />Plat végétarien
            </label>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              type="button"
              (click)="brouillon.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="!valide(b) || occupe()"
              (click)="enregistrer(b)"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlatsComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);

  readonly categories = CATEGORIES;
  readonly cat = (c: string) => CATEGORIES.find((x) => x.code === c)?.libelle ?? c;

  plats = signal<Plat[]>([]);
  allergenes = signal<Allergene[]>([]);
  chargement = signal(true);
  occupe = signal(false);
  brouillon = signal<Brouillon | null>(null);

  recherche = signal('');
  filtreCategorie = signal('');
  seulementArachide = signal(false);

  visibles = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return this.plats().filter(
      (p) =>
        (!q || p.nom.toLowerCase().includes(q)) &&
        (!this.filtreCategorie() || p.categorie === this.filtreCategorie()) &&
        (!this.seulementArachide() || p.allergenes.some((a) => a.code === 'ARACHIDES')),
    );
  });

  tuiles = computed(() => {
    const actifs = this.plats().filter((p) => p.actif);
    const notes = actifs.filter((p) => p.noteMoyenne !== null);
    const moyenne = notes.length
      ? notes.reduce((s, p) => s + (p.noteMoyenne ?? 0), 0) / notes.length
      : null;
    const meilleur = [...notes].sort((a, b) => (b.noteMoyenne ?? 0) - (a.noteMoyenne ?? 0))[0];
    return [
      {
        label: 'Plats au catalogue',
        valeur: String(actifs.length),
        icone: 'pi-book',
        detail: `${this.plats().length - actifs.length} désactivé(s)`,
      },
      {
        label: 'Note moyenne',
        valeur: moyenne === null ? '—' : `${moyenne.toFixed(1)} / 5`,
        icone: 'pi-star-fill',
        detail: `${notes.length} plats notés`,
      },
      {
        label: 'Plat le mieux noté',
        valeur: meilleur?.nom ?? '—',
        icone: 'pi-verified',
        detail: meilleur ? `${meilleur.noteMoyenne} · ${meilleur.nbAvis} avis` : '',
      },
      {
        label: 'Plats avec allergène majeur',
        valeur: String(actifs.filter((p) => p.allergenes.length).length),
        icone: 'pi-exclamation-triangle',
        detail: 'Signalés aux élèves concernés',
      },
    ];
  });

  filtresCategorie = computed(() => [
    { code: '', libelle: 'Tous', n: this.plats().length },
    ...this.categories.map((c) => ({
      code: c.code as string,
      libelle: c.libelle,
      n: this.plats().filter((p) => p.categorie === c.code).length,
    })),
  ]);

  etoiles(note: number): string {
    const pleines = Math.round(note);
    return '★'.repeat(pleines) + '☆'.repeat(5 - pleines);
  }

  ngOnInit(): void {
    this.charger();
    this.api
      .allergenes()
      .subscribe({ next: (a) => this.allergenes.set(a), error: () => undefined });
  }

  charger(): void {
    this.api.plats({ limit: 100, inclureArchives: true }).subscribe({
      next: (r) => {
        this.plats.set(r.plats);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  effacer(): void {
    this.recherche.set('');
    this.filtreCategorie.set('');
    this.seulementArachide.set(false);
  }

  nouveau(): void {
    this.brouillon.set({ ...VIDE, allergenes: [] });
  }

  modifier(p: Plat): void {
    this.brouillon.set({
      id: p.id,
      nom: p.nom,
      categorie: p.categorie,
      prix: p.prix,
      poidsPortionG: p.poidsPortionG,
      description: p.description ?? '',
      photo: p.photoUrl?.startsWith(PHOTOS) ? p.photoUrl.slice(PHOTOS.length) : (p.photoUrl ?? ''),
      vegetarien: p.vegetarien,
      allergenes: p.allergenes.map((a) => a.code),
    });
  }

  cocher(b: Brouillon, code: string): void {
    b.allergenes = b.allergenes.includes(code)
      ? b.allergenes.filter((c) => c !== code)
      : [...b.allergenes, code];
  }

  valide(b: Brouillon): boolean {
    return b.nom.trim().length > 1 && b.prix !== null && Number(b.prix) >= 0;
  }

  enregistrer(b: Brouillon): void {
    const photo = b.photo.trim();
    const corps: FormulairePlat = {
      nom: b.nom.trim(),
      categorie: b.categorie,
      prix: Number(b.prix),
      description: b.description.trim() || undefined,
      poidsPortionG: b.poidsPortionG ? Number(b.poidsPortionG) : undefined,
      vegetarien: b.vegetarien,
      photoUrl: photo ? (photo.startsWith('http') ? photo : PHOTOS + photo) : undefined,
      allergenes: b.allergenes,
    };
    this.occupe.set(true);
    const requete = b.id ? this.api.modifierPlat(b.id, corps) : this.api.creerPlat(corps);
    requete.subscribe({
      next: () => {
        this.toast.success(b.id ? 'Plat modifié.' : 'Plat créé.');
        this.occupe.set(false);
        this.brouillon.set(null);
        this.charger();
      },
      error: () => this.occupe.set(false),
    });
  }

  basculerActif(p: Plat): void {
    this.api.modifierPlat(p.id, { actif: !p.actif }).subscribe({
      next: () => {
        this.toast.success(p.actif ? 'Plat désactivé.' : 'Plat réactivé.');
        this.charger();
      },
    });
  }
}
