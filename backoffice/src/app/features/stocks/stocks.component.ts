import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { ArticleStock, CantineApi, Stocks } from '../../core/services/cantine-api.service';
import { telechargerCsv } from '../../core/utils/csv.utils';
import { ToastService } from '../../core/services/toast.service';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';

const MOTIFS_ENTREE = ['Livraison fournisseur', 'Inventaire', 'Retour'];
const MOTIFS_SORTIE = ['Préparation du service', 'Perte ou casse', 'Inventaire'];
const nf = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent,
    StatTileComponent,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-800">Stocks</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          Ingrédients de la cuisine, seuils d'alerte et mouvements d'entrée ou de sortie.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="exporter()"
          class="px-3.5 py-2 rounded-lg border border-vatel-primary text-vatel-primary text-sm font-semibold hover:bg-[#e7f3fc]"
        >
          <i class="pi pi-download mr-1.5" aria-hidden="true"></i>Exporter CSV
        </button>
        <button
          type="button"
          (click)="ouvrir(null, null)"
          class="px-3.5 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark"
        >
          <i class="pi pi-plus mr-1.5" aria-hidden="true"></i>Mouvement de stock
        </button>
      </div>
    </div>

    @if (donnees(); as d) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <app-stat-tile [value]="d.compteurs.suivis" label="Articles suivis" icon="pi-box" />
        <app-stat-tile [value]="d.compteurs.sousSeuil" label="Sous le seuil" icon="pi-arrow-down" />
        <app-stat-tile [value]="d.compteurs.rupture" label="En rupture" icon="pi-ban" />
        <app-stat-tile
          [value]="d.compteurs.mouvementsSemaine"
          label="Mouvements cette semaine"
          icon="pi-history"
        />
      </div>

      @if (ruptures().length) {
        <p
          class="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 text-warning text-sm px-4 py-3 mb-4"
          role="alert"
        >
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          <span
            ><strong>{{ ruptureNoms() }} en rupture</strong> : passez commande avant le prochain
            service pour éviter un plat indisponible.</span
          >
        </p>
      }

      <div class="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_300px]">
        <app-card>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <div class="relative">
              <i
                class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                aria-hidden="true"
              ></i>
              <input
                type="search"
                placeholder="Rechercher un article…"
                aria-label="Rechercher un article"
                [ngModel]="recherche()"
                (ngModelChange)="recherche.set($event)"
                class="border border-gray-300 rounded-full pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:border-vatel-primary"
              />
            </div>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Statut">
              @for (f of filtres(); track f.code) {
                <button
                  type="button"
                  (click)="filtre.set(f.code)"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold"
                  [class]="
                    filtre() === f.code
                      ? 'bg-vatel-primary border-vatel-primary text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  "
                  [attr.aria-pressed]="filtre() === f.code"
                >
                  {{ f.libelle }}
                  <span
                    class="text-[11px] rounded-full px-1.5"
                    [class]="filtre() === f.code ? 'bg-white/25' : 'bg-gray-100'"
                    >{{ f.n }}</span
                  >
                </button>
              }
            </div>
          </div>

          @if (visibles().length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th class="py-2 pr-3 font-semibold">Article</th>
                    <th class="py-2 pr-3 font-semibold">Niveau</th>
                    <th class="py-2 pr-3 font-semibold text-right">Quantité</th>
                    <th class="py-2 pr-3 font-semibold text-right">Seuil</th>
                    <th class="py-2 pr-3 font-semibold">Statut</th>
                    <th class="py-2 font-semibold text-right">Mouvement</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of visibles(); track a.id) {
                    <tr class="border-b border-gray-100">
                      <td class="py-2.5 pr-3 font-semibold text-gray-800">{{ a.nom }}</td>
                      <td class="py-2.5 pr-3 w-36">
                        <span
                          class="block h-2 rounded-full bg-gray-100 overflow-hidden"
                          aria-hidden="true"
                        >
                          <span
                            class="block h-full rounded-full"
                            [class]="a.statut === 'OK' ? 'bg-vatel-primary-light' : 'bg-orange-500'"
                            [style.width.%]="a.niveau"
                          ></span>
                        </span>
                      </td>
                      <td class="py-2.5 pr-3 text-right">
                        <b>{{ nf(a.quantite) }}</b> {{ a.unite }}
                      </td>
                      <td class="py-2.5 pr-3 text-right text-gray-500">
                        {{ nf(a.seuilAlerte) }} {{ a.unite }}
                      </td>
                      <td class="py-2.5 pr-3">
                        <span
                          class="text-xs font-semibold rounded-full px-2.5 py-1"
                          [class]="
                            a.statut === 'OK'
                              ? 'bg-green-50 text-success'
                              : a.statut === 'BAS'
                                ? 'bg-amber-50 text-warning'
                                : 'bg-red-50 text-error'
                          "
                          >{{
                            a.statut === 'OK' ? 'OK' : a.statut === 'BAS' ? 'Bas' : 'Rupture'
                          }}</span
                        >
                      </td>
                      <td class="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          (click)="ouvrir(a, 'ENTREE')"
                          class="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:text-success hover:border-success mr-1.5"
                          [attr.aria-label]="'Entrée de ' + a.nom"
                          title="Entrée"
                        >
                          <i class="pi pi-plus text-xs" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          (click)="ouvrir(a, 'SORTIE')"
                          class="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:text-error hover:border-error"
                          [attr.aria-label]="'Sortie de ' + a.nom"
                          title="Sortie"
                        >
                          <i class="pi pi-minus text-xs" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state
              icon="pi-box"
              title="Aucun article"
              message="Aucun article dans ce filtre."
              actionLabel="Tout afficher"
              (action)="reinitialiser()"
            />
          }
        </app-card>

        <app-card>
          <h2 class="font-bold text-gray-800 mb-3">Derniers mouvements</h2>
          @for (m of d.mouvements; track m.id) {
            <div class="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span
                class="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0"
                [class]="m.delta < 0 ? 'bg-red-50 text-error' : 'bg-green-50 text-success'"
              >
                <i
                  class="pi text-xs"
                  [class]="m.delta < 0 ? 'pi-arrow-up' : 'pi-arrow-down'"
                  aria-hidden="true"
                ></i>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ m.article }}</p>
                <p class="text-[11px] text-gray-500 truncate">
                  {{ m.motif }} · {{ m.creeLe | date: 'd MMM HH:mm' }}
                </p>
              </div>
              <span
                class="text-sm font-bold whitespace-nowrap"
                [class]="m.delta < 0 ? 'text-error' : 'text-success'"
                >{{ m.delta > 0 ? '+' : '−' }}{{ nf(absolu(m.delta)) }} {{ m.unite }}</span
              >
            </div>
          } @empty {
            <p class="text-sm text-gray-400">Aucun mouvement enregistré.</p>
          }
        </app-card>
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
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-skeleton height="76px" radius="12px" />
        }
      </div>
      <app-skeleton height="320px" radius="12px" />
    }

    @if (modale(); as m) {
      <div
        class="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-3"
        (click)="modale.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mv-titre"
        >
          <div
            class="shrink-0 flex items-center justify-between px-5 pt-4 pb-2.5 border-b border-gray-100"
          >
            <h3 id="mv-titre" class="text-lg font-bold text-gray-800">Mouvement de stock</h3>
            <button
              type="button"
              (click)="modale.set(null)"
              class="w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Fermer"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="mv-art"
                >Article</label
              >
              <select
                id="mv-art"
                [(ngModel)]="m.articleId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Choisir un article…</option>
                @for (a of donnees()!.articles; track a.id) {
                  <option [value]="a.id">{{ a.nom }} ({{ nf(a.quantite) }} {{ a.unite }})</option>
                }
              </select>
            </div>
            <div
              class="flex rounded-lg border border-gray-200 overflow-hidden"
              role="group"
              aria-label="Type de mouvement"
            >
              <button
                type="button"
                (click)="changerType('ENTREE')"
                class="flex-1 px-3 py-2 text-sm font-semibold"
                [class]="m.type === 'ENTREE' ? 'bg-success text-white' : 'bg-white text-gray-600'"
              >
                <i class="pi pi-arrow-down text-xs mr-1.5" aria-hidden="true"></i>Entrée
              </button>
              <button
                type="button"
                (click)="changerType('SORTIE')"
                class="flex-1 px-3 py-2 text-sm font-semibold"
                [class]="m.type === 'SORTIE' ? 'bg-error text-white' : 'bg-white text-gray-600'"
              >
                <i class="pi pi-arrow-up text-xs mr-1.5" aria-hidden="true"></i>Sortie
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="mv-qte"
                  >Quantité {{ articleChoisi() ? '(' + articleChoisi()!.unite + ')' : '' }}</label
                >
                <input
                  id="mv-qte"
                  type="number"
                  min="0"
                  step="0.5"
                  [(ngModel)]="m.quantite"
                  class="w-full border rounded-lg px-3 py-2"
                  [class]="depasse() ? 'border-error' : 'border-gray-300'"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="mv-motif"
                  >Motif</label
                >
                <select
                  id="mv-motif"
                  [(ngModel)]="m.motif"
                  [disabled]="!m.type"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  @if (!m.type) {
                    <option value="">Choisir Entrée ou Sortie</option>
                  }
                  @for (x of motifs(); track x) {
                    <option [value]="x">{{ x }}</option>
                  }
                </select>
              </div>
            </div>
            @if (depasse()) {
              <p class="text-xs text-error">
                <i class="pi pi-exclamation-circle mr-1" aria-hidden="true"></i>La sortie dépasse le
                stock disponible ({{ nf(articleChoisi()!.quantite) }} {{ articleChoisi()!.unite }}).
              </p>
            }
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="mv-note"
                >Note (facultatif)</label
              >
              <input
                id="mv-note"
                [(ngModel)]="m.note"
                placeholder="Ex. bon de livraison n° 214"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div class="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              (click)="modale.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="!valide() || occupe()"
              (click)="enregistrer()"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              <i class="pi pi-check mr-1.5" aria-hidden="true"></i>Enregistrer
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StocksComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);

  readonly nf = nf;
  donnees = signal<Stocks | null>(null);
  erreur = signal('');
  occupe = signal(false);
  recherche = signal('');
  filtre = signal<'' | 'OK' | 'BAS' | 'RUPTURE'>('');
  modale = signal<{
    articleId: string;
    type: 'ENTREE' | 'SORTIE' | null;
    quantite: number | null;
    motif: string;
    note: string;
  } | null>(null);

  ruptures = computed(() => (this.donnees()?.articles ?? []).filter((a) => a.statut === 'RUPTURE'));
  ruptureNoms = computed(() =>
    this.ruptures()
      .map((a) => a.nom)
      .join(', '),
  );
  filtres = computed(() => {
    const a = this.donnees()?.articles ?? [];
    const n = (s: string) => a.filter((x) => x.statut === s).length;
    return [
      { code: '' as const, libelle: 'Tous', n: a.length },
      { code: 'OK' as const, libelle: 'OK', n: n('OK') },
      { code: 'BAS' as const, libelle: 'Bas', n: n('BAS') },
      { code: 'RUPTURE' as const, libelle: 'Rupture', n: n('RUPTURE') },
    ];
  });
  visibles = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return (this.donnees()?.articles ?? []).filter(
      (a) =>
        (!this.filtre() || a.statut === this.filtre()) && (!q || a.nom.toLowerCase().includes(q)),
    );
  });
  motifs(): string[] {
    const type = this.modale()?.type;
    return type === 'SORTIE' ? MOTIFS_SORTIE : type === 'ENTREE' ? MOTIFS_ENTREE : [];
  }
  articleChoisi(): ArticleStock | null {
    return this.donnees()?.articles.find((a) => a.id === this.modale()?.articleId) ?? null;
  }
  depasse(): boolean {
    const m = this.modale();
    const a = this.articleChoisi();
    return !!m && !!a && m.type === 'SORTIE' && (m.quantite ?? 0) > a.quantite;
  }
  valide(): boolean {
    const m = this.modale();
    return (
      !!m && !!m.type && !!m.articleId && (m.quantite ?? 0) > 0 && !!m.motif && !this.depasse()
    );
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.api.stocks().subscribe({
      next: (d) => {
        this.donnees.set(d);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
  }

  absolu(n: number): number {
    return Math.abs(n);
  }

  reinitialiser(): void {
    this.recherche.set('');
    this.filtre.set('');
  }

  ouvrir(a: ArticleStock | null, type: 'ENTREE' | 'SORTIE' | null): void {
    this.modale.set({
      articleId: a?.id ?? '',
      type,
      quantite: null,
      motif: type ? (type === 'SORTIE' ? MOTIFS_SORTIE : MOTIFS_ENTREE)[0] : '',
      note: '',
    });
  }

  changerType(type: 'ENTREE' | 'SORTIE'): void {
    const m = this.modale();
    if (m)
      this.modale.set({
        ...m,
        type,
        motif: (type === 'SORTIE' ? MOTIFS_SORTIE : MOTIFS_ENTREE)[0],
      });
  }

  async enregistrer(): Promise<void> {
    const m = this.modale();
    if (!m || !this.valide()) return;
    this.occupe.set(true);
    try {
      await lastValueFrom(
        this.api.mouvementStock(m.articleId, {
          type: m.type as 'ENTREE' | 'SORTIE',
          quantite: Number(m.quantite),
          motif: m.motif,
          note: m.note || undefined,
        }),
      );
      this.toast.success(m.type === 'ENTREE' ? 'Entrée enregistrée.' : 'Sortie enregistrée.');
      this.modale.set(null);
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  exporter(): void {
    const d = this.donnees();
    if (!d) return;
    telechargerCsv(
      'stocks.csv',
      ['Article', 'Unité', 'Quantité', 'Seuil', 'Statut'],
      d.articles.map((a) => [a.nom, a.unite, a.quantite, a.seuilAlerte, a.statut]),
    );
  }
}
