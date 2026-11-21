import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { interval, lastValueFrom } from 'rxjs';
import {
  CantineApi,
  Commandes,
  ItemMenu,
  StatsJour,
} from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';

interface Ligne {
  item: ItemMenu;
  preparees: number;
  servies: number;
  restantes: number;
  vendues: number;
  prixOffre: number;
}

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const kg = (g: number) =>
  (Math.round(g / 100) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1 });
const arrondi50 = (n: number) => Math.round(n / 50) * 50;

/** Anti-gaspillage : portions restantes par plat, offre de fin de service à prix réduit. */
@Component({
  selector: 'app-anti-gaspi',
  standalone: true,
  imports: [DatePipe, StatTileComponent, CardComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-800">Anti-gaspillage</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          Fin de service : proposez les portions restantes à prix réduit plutôt que de les jeter.
        </p>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-warning text-sm font-semibold px-3 py-1.5"
      >
        <i class="pi pi-clock text-xs" aria-hidden="true"></i>{{ maintenant | date: "HH'h'mm" }} ·
        service du {{ maintenant | date: 'd MMMM' }}
      </span>
    </div>

    @if (lignes(); as l) {
      @if (!l.length) {
        <app-card>
          <app-empty-state
            icon="pi-calendar"
            title="Pas de menu aujourd'hui"
            message="Publiez le menu du jour pour gérer les portions restantes."
          />
        </app-card>
      } @else {
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          @for (t of tuiles(); track t.label) {
            <div class="flex flex-col">
              <app-stat-tile [value]="t.valeur" [label]="t.label" [icon]="t.icone" />
              <span class="text-[11px] text-gray-500 mt-1.5 px-1">{{ t.detail }}</span>
            </div>
          }
        </div>

        <div class="grid gap-4 xl:grid-cols-[1fr_340px] mb-5">
          <app-card>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 class="font-bold text-gray-800">Portions restantes par plat</h2>
                <p class="text-xs text-gray-500">Préparées − servies</p>
              </div>
              @if (offreActive()) {
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                  <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>Offre en cours
                  jusqu'à {{ jusqua() | date: "HH'h'mm" }}
                </span>
              }
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th class="py-2 pr-3 font-semibold">Plat</th>
                    <th class="py-2 pr-3 font-semibold text-right">Préparées</th>
                    <th class="py-2 pr-3 font-semibold text-right">Servies</th>
                    <th class="py-2 pr-3 font-semibold text-right">Restantes</th>
                    <th class="py-2 pr-3 font-semibold text-right">Prix</th>
                    <th class="py-2 pr-3 font-semibold text-right">Prix offre</th>
                    <th class="py-2 font-semibold">Écoulement</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of l; track r.item.id) {
                    <tr class="border-b border-gray-100">
                      <td class="py-2.5 pr-3">
                        <p class="font-semibold text-gray-800">{{ r.item.plat.nom }}</p>
                        <p class="text-xs text-gray-500">
                          {{ r.item.plat.poidsPortionG ?? '—' }} g / portion
                        </p>
                      </td>
                      <td class="py-2.5 pr-3 text-right">{{ r.preparees }}</td>
                      <td class="py-2.5 pr-3 text-right">{{ r.servies }}</td>
                      <td class="py-2.5 pr-3 text-right font-bold">{{ r.restantes }}</td>
                      <td class="py-2.5 pr-3 text-right text-gray-400 line-through">
                        {{ r.item.plat.prix }}
                      </td>
                      <td class="py-2.5 pr-3 text-right font-bold text-success">
                        {{ r.restantes > 0 ? r.prixOffre : '—' }}
                      </td>
                      <td class="py-2.5 min-w-36">
                        @if (r.restantes > 0 || r.vendues > 0) {
                          <div class="flex items-center gap-2">
                            <span class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"
                              ><span
                                class="block h-full bg-success"
                                [style.width.%]="pourcent(r.vendues, r.vendues + r.restantes)"
                              ></span
                            ></span>
                            <span class="text-xs text-gray-500"
                              >{{ r.vendues }}/{{ r.vendues + r.restantes }}</span
                            >
                          </div>
                        } @else {
                          <span
                            class="text-xs rounded-full bg-green-50 text-success font-semibold px-2 py-0.5"
                            >Épuisé · 0 perte</span
                          >
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="flex flex-wrap items-center gap-3 pt-4 mt-2 border-t border-gray-100">
              @if (!offreActive()) {
                <button
                  type="button"
                  [disabled]="occupe() || totalRestantes() === 0"
                  (click)="confirmation.set(true)"
                  class="px-5 py-2.5 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
                >
                  <i class="pi pi-megaphone mr-2" aria-hidden="true"></i>Lancer l'offre −{{
                    reduction()
                  }}
                  %
                </button>
                <span class="text-xs text-gray-500"
                  >Notification aux élèves qui ont réservé aujourd'hui · réservation dans l'appli,
                  retrait au comptoir</span
                >
              } @else {
                <p
                  class="flex-1 flex items-center gap-2 text-sm bg-green-50 text-success rounded-lg px-3 py-2"
                >
                  <i class="pi pi-check-circle" aria-hidden="true"></i>
                  <span
                    ><strong>{{ vendues() }} portions vendues</strong> ·
                    {{ kgSauvesAujourdhui() }} kg sauvés aujourd'hui.</span
                  >
                </p>
                <button
                  type="button"
                  [disabled]="occupe()"
                  (click)="clore()"
                  class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  <i class="pi pi-ban mr-1.5" aria-hidden="true"></i>Clore l'offre
                </button>
              }
            </div>
          </app-card>

          <div class="space-y-4">
            <app-card>
              <h2 class="font-bold text-gray-800 mb-4">Réglages de l'offre</h2>
              <p class="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                Réduction
              </p>
              <div
                class="flex rounded-lg border border-gray-200 overflow-hidden mb-4"
                role="group"
                aria-label="Réduction"
              >
                @for (v of [30, 50, 70]; track v) {
                  <button
                    type="button"
                    [disabled]="offreActive()"
                    (click)="reduction.set(v)"
                    class="flex-1 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    [class]="
                      reduction() === v
                        ? 'bg-vatel-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    "
                    [attr.aria-pressed]="reduction() === v"
                  >
                    −{{ v }} %
                  </button>
                }
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    class="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5 block"
                    for="ag-duree"
                    >Durée</label
                  >
                  <select
                    id="ag-duree"
                    [disabled]="offreActive()"
                    [value]="duree()"
                    (change)="duree.set(+$any($event.target).value)"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 heure</option>
                  </select>
                </div>
                <div>
                  <label
                    class="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5 block"
                    for="ag-dest"
                    >Destinataires</label
                  >
                  <select
                    id="ag-dest"
                    disabled
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
                  >
                    <option>Présents aujourd'hui</option>
                  </select>
                </div>
              </div>
            </app-card>
            <app-card>
              <h2 class="font-bold text-gray-800 mb-3">
                <i class="pi pi-mobile text-vatel-primary mr-1.5" aria-hidden="true"></i>Aperçu de
                la notification
              </h2>
              <div class="bg-[#0d3a5c] rounded-2xl p-3.5">
                <div class="bg-white/95 rounded-xl p-3 flex gap-2.5">
                  <img src="/logo.png" alt="" class="w-7 h-7 rounded-md" />
                  <div class="min-w-0">
                    <p class="text-[11px] text-gray-500">CANTINE VATEL · maintenant</p>
                    <p class="text-sm font-bold text-gray-900 mt-0.5">
                      Fin de service : −{{ reduction() }} % pendant {{ duree() }} min
                    </p>
                    <p class="text-xs text-gray-700 mt-0.5 leading-snug">
                      {{ texteNotification() }} Réservez dans l'appli, retrait au comptoir.
                    </p>
                  </div>
                </div>
              </div>
            </app-card>
          </div>
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
      <div class="grid grid-cols-4 gap-3 mb-5">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-skeleton height="96px" radius="12px" />
        }
      </div>
      <app-skeleton height="300px" radius="12px" />
    }

    @if (confirmation()) {
      <div
        class="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-4"
        (click)="confirmation.set(false)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5 text-center"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ag-titre"
        >
          <span
            class="w-14 h-14 rounded-full bg-amber-50 text-warning inline-flex items-center justify-center mb-3"
            ><i class="pi pi-megaphone text-xl" aria-hidden="true"></i
          ></span>
          <h3 id="ag-titre" class="text-lg font-bold text-gray-800">
            Lancer l'offre −{{ reduction() }} % ?
          </h3>
          <p class="text-sm text-gray-500 mt-2">
            {{ totalRestantes() }} portions seront proposées à prix réduit pendant
            {{ duree() }} minutes. Les élèves qui ont réservé aujourd'hui recevront une
            notification.
          </p>
          <div class="flex justify-center gap-2 mt-5">
            <button
              type="button"
              (click)="confirmation.set(false)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="occupe()"
              (click)="lancer()"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              <i class="pi pi-send mr-1.5" aria-hidden="true"></i>Envoyer l'offre
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AntiGaspiComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  aujourdhui = new Date().toISOString().slice(0, 10);
  maintenant = new Date();

  items = signal<ItemMenu[] | null>(null);
  commandes = signal<Commandes | null>(null);
  stats = signal<StatsJour | null>(null);
  erreur = signal('');
  occupe = signal(false);
  confirmation = signal(false);
  reduction = signal(50);
  duree = signal(45);

  /** Les plats du jour avec leurs portions préparées, servies, restantes et vendues en offre. */
  lignes = computed<Ligne[] | null>(() => {
    const items = this.items();
    const c = this.commandes();
    if (!items || !c) return null;
    return items
      .filter((i) => i.plat.categorie === 'PLAT' || i.plat.categorie === 'DESSERT')
      .map((item) => {
        const resas = c.reservations.filter((r) => r.plat.id === item.plat.id);
        const servies = resas.filter((r) => r.statut === 'SERVIE').length;
        const preparees = item.portionsPrevues ?? 0;
        const vendues = resas.filter((r) => r.antiGaspi && r.statut !== 'ANNULEE').length;
        return {
          item,
          preparees,
          servies,
          vendues,
          restantes: Math.max(0, preparees - servies - vendues),
          prixOffre:
            item.prixAntiGaspi && this.offreActive()
              ? item.prixAntiGaspi
              : arrondi50(item.plat.prix * (1 - this.reduction() / 100)),
        };
      });
  });

  totalRestantes = computed(() => (this.lignes() ?? []).reduce((s, l) => s + l.restantes, 0));
  totalPreparees = computed(() => (this.lignes() ?? []).reduce((s, l) => s + l.preparees, 0));
  vendues = computed(() => (this.lignes() ?? []).reduce((s, l) => s + l.vendues, 0));
  offreActive = computed(() =>
    (this.items() ?? []).some((i) => i.antiGaspiJusqua && new Date(i.antiGaspiJusqua) > new Date()),
  );
  jusqua = computed(
    () =>
      (this.items() ?? [])
        .map((i) => i.antiGaspiJusqua)
        .filter(Boolean)
        .sort()
        .pop() ?? null,
  );
  kgARisque = computed(() =>
    kg(
      (this.lignes() ?? []).reduce((s, l) => s + l.restantes * (l.item.plat.poidsPortionG ?? 0), 0),
    ),
  );
  kgSauvesAujourdhui = computed(() =>
    kg((this.lignes() ?? []).reduce((s, l) => s + l.vendues * (l.item.plat.poidsPortionG ?? 0), 0)),
  );

  tuiles = computed(() => {
    const s = this.stats();
    const prep = this.totalPreparees();
    const rest = this.totalRestantes();
    return [
      {
        label: 'Portions restantes',
        valeur: String(rest),
        detail: `Sur ${prep} portions préparées`,
        icone: 'pi-box',
        classe: 'text-vatel-primary-dark',
        fond: 'bg-[#e7f3fc] text-vatel-primary',
      },
      {
        label: "À sauver aujourd'hui",
        valeur: `${this.kgARisque()} kg`,
        detail: 'Poids portion × portions restantes',
        icone: 'pi-exclamation-triangle',
        classe: 'text-vatel-primary-dark',
        fond: 'bg-orange-50 text-orange-700',
      },
      {
        label: 'Sauvés ce mois',
        valeur: s ? `${s.kgSauvesMois.toLocaleString('fr-FR')} kg` : '—',
        detail: s ? `${s.repasSauvesMois} repas à prix réduit` : '',
        icone: 'pi-heart-fill',
        classe: 'text-success',
        fond: 'bg-green-50 text-success',
      },
      {
        label: 'Taux de gaspillage',
        valeur: prep
          ? `${((rest / prep) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
          : '—',
        detail: 'Restantes ÷ préparées',
        icone: 'pi-chart-line',
        classe: 'text-vatel-primary-dark',
        fond: 'bg-[#e7f3fc] text-vatel-primary',
      },
    ];
  });

  texteNotification = computed(
    () =>
      (this.lignes() ?? [])
        .filter((l) => l.restantes > 0)
        .map((l) => `${l.item.plat.nom} à ${fcfa(l.prixOffre)}`)
        .join(', ') + '.',
  );

  ngOnInit(): void {
    this.charger();
    interval(20000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charger());
  }

  charger(): void {
    this.maintenant = new Date();
    this.api.semaine().subscribe({
      next: (s) => {
        this.items.set(s.jours.find((j) => j.date === this.aujourdhui)?.items ?? []);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
    this.api
      .commandes({})
      .subscribe({ next: (c) => this.commandes.set(c), error: () => undefined });
    this.api.statsJour().subscribe({ next: (s) => this.stats.set(s), error: () => undefined });
  }

  pourcent(a: number, b: number): number {
    return b ? Math.min(100, Math.round((a / b) * 100)) : 0;
  }

  async lancer(): Promise<void> {
    this.occupe.set(true);
    try {
      const r = await lastValueFrom(
        this.api.lancerOffre(this.aujourdhui, {
          reduction: this.reduction(),
          dureeMinutes: this.duree(),
        }),
      );
      this.toast.success(`Offre −${this.reduction()} % envoyée à ${r.data.elevesNotifies} élèves.`);
      this.confirmation.set(false);
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  async clore(): Promise<void> {
    this.occupe.set(true);
    try {
      await lastValueFrom(this.api.cloreOffre(this.aujourdhui));
      this.toast.success(`Offre close : ${this.vendues()} portions sauvées.`);
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }
}
