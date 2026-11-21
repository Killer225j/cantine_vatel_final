import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CantineApi, Synthese } from '../../core/services/cantine-api.service';
import { telechargerCsv } from '../../core/utils/csv.utils';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';

type Preset = '7j' | 'mois' | 'trimestre' | 'perso';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const decaler = (jour: string, n: number) => {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const MOYENS: Record<string, string> = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  MOOV_MONEY: 'Moov Money',
};
const CATEGORIES: Record<string, string> = {
  ENTREE: 'Entrées',
  PLAT: 'Plats',
  DESSERT: 'Desserts',
  BOISSON: 'Boissons',
};
const fcfa = (n: number) => n.toLocaleString('fr-FR');

@Component({
  selector: 'app-rapports',
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
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Rapports</h1>
      <p class="text-sm text-vatel-primary mt-0.5">
        Fréquentation, recettes, gaspillage évité et satisfaction, sur la période choisie.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-5">
      <div class="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Période">
        @for (p of presets; track p.code) {
          <button
            type="button"
            (click)="choisir(p.code)"
            class="px-4 py-1.5 rounded-full text-sm font-semibold"
            [class]="
              preset() === p.code ? 'bg-white text-vatel-primary shadow-sm' : 'text-gray-600'
            "
            [attr.aria-pressed]="preset() === p.code"
          >
            {{ p.libelle }}
          </button>
        }
      </div>
      <input
        type="date"
        aria-label="Début"
        [ngModel]="debut()"
        (ngModelChange)="saisir($event, null)"
        class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
      />
      <i class="pi pi-arrow-right text-gray-400 text-sm" aria-hidden="true"></i>
      <input
        type="date"
        aria-label="Fin"
        [ngModel]="fin()"
        (ngModelChange)="saisir(null, $event)"
        class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
      />
      <button
        type="button"
        (click)="toutExporter()"
        [disabled]="!donnees()"
        class="ml-auto px-4 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
      >
        <i class="pi pi-file-export mr-1.5" aria-hidden="true"></i>Tout exporter
      </button>
    </div>

    @if (donnees(); as d) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-1">
        <div class="flex flex-col">
          <app-stat-tile
            [value]="nf(d.repasServis.total)"
            label="Repas servis"
            icon="pi-shopping-bag"
          />
          <span class="text-[11px] text-gray-500 mt-1.5 px-1"
            >Présence {{ d.repasServis.presence }} %
            @if (d.repasServis.evolution !== null) {
              ·
              <b [class]="d.repasServis.evolution >= 0 ? 'text-success' : 'text-error'"
                >{{ d.repasServis.evolution >= 0 ? '+' : '' }}{{ d.repasServis.evolution }} %</b
              >
              vs période précédente
            }
          </span>
        </div>
        <div class="flex flex-col">
          <app-stat-tile [value]="nf(d.recettes.total)" label="Recettes (FCFA)" icon="pi-wallet" />
          <span class="text-[11px] text-gray-500 mt-1.5 px-1"
            >Ticket moyen {{ nf(d.recettes.ticketMoyen) }} FCFA</span
          >
        </div>
        <div class="flex flex-col">
          <app-stat-tile
            [value]="d.gaspillageEvite.kg + ' kg'"
            label="Gaspillage évité"
            icon="pi-heart-fill"
          />
          <span class="text-[11px] text-gray-500 mt-1.5 px-1"
            >{{ d.gaspillageEvite.offres }} jour(s) d'offre · {{ d.gaspillageEvite.repas }} repas
            sauvés</span
          >
        </div>
        <div class="flex flex-col">
          <app-stat-tile
            [value]="d.satisfaction.avis ? d.satisfaction.moyenne + ' / 5' : '—'"
            label="Note moyenne des plats"
            icon="pi-star-fill"
          />
          <span class="text-[11px] text-gray-500 mt-1.5 px-1"
            >{{ d.satisfaction.avis }} avis d'élèves</span
          >
        </div>
      </div>

      <div class="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
        <app-card>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 class="font-bold text-gray-800">Fréquentation</h2>
              <p class="text-xs text-gray-500">Repas servis par semaine</p>
            </div>
            <button
              type="button"
              (click)="exporterFrequentation()"
              class="px-3 py-1.5 rounded-lg border border-vatel-primary text-vatel-primary text-xs font-semibold hover:bg-[#e7f3fc]"
            >
              <i class="pi pi-download mr-1" aria-hidden="true"></i>Exporter CSV
            </button>
          </div>
          @if (d.frequentation.length) {
            <div
              class="flex items-end gap-3 h-44 border-b border-gray-200"
              role="img"
              aria-label="Repas servis par semaine"
            >
              @for (s of d.frequentation; track s.debut) {
                <div class="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                  <span class="text-[11px] font-bold text-gray-700 mb-1">{{ s.repas }}</span>
                  <div
                    class="w-full rounded-t-md bg-vatel-primary-light"
                    [style.height.%]="hauteur(s.repas)"
                  ></div>
                </div>
              }
            </div>
            <div class="flex gap-3 mt-1.5">
              @for (s of d.frequentation; track s.debut) {
                <span class="flex-1 text-center text-[10px] text-gray-500 truncate"
                  >{{ s.debut | date: 'd' }} – {{ s.fin | date: 'd MMM' }}</span
                >
              }
            </div>
          } @else {
            <p class="text-sm text-gray-400 py-8 text-center">
              Aucun repas servi sur cette période.
            </p>
          }
        </app-card>

        <app-card>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 class="font-bold text-gray-800">Recettes et recharges</h2>
              <p class="text-xs text-gray-500">Recharges des portefeuilles par moyen de paiement</p>
            </div>
            <button
              type="button"
              (click)="exporterRecettes()"
              class="px-3 py-1.5 rounded-lg border border-vatel-primary text-vatel-primary text-xs font-semibold hover:bg-[#e7f3fc]"
            >
              <i class="pi pi-download mr-1" aria-hidden="true"></i>Exporter CSV
            </button>
          </div>
          @for (m of d.recharges.parMoyen; track m.moyen) {
            <div class="flex items-center gap-3 mb-2 text-sm">
              <span class="w-28 text-gray-700">{{ moyen(m.moyen) }}</span>
              <span class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true"
                ><span
                  class="block h-full rounded-full bg-vatel-primary"
                  [style.width.%]="m.pourcentage"
                ></span
              ></span>
              <span class="w-12 text-right text-gray-700">{{ m.pourcentage }} %</span>
            </div>
          } @empty {
            <p class="text-sm text-gray-400 mb-2">Aucune recharge sur cette période.</p>
          }
          <table class="w-full text-sm mt-3">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-500 bg-gray-50">
                <th class="py-2 px-3 font-semibold">Catégorie</th>
                <th class="py-2 px-3 font-semibold text-right">Ventes</th>
                <th class="py-2 px-3 font-semibold text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              @for (v of d.ventes; track v.categorie) {
                <tr class="border-b border-gray-100">
                  <td class="py-2 px-3">{{ categorie(v.categorie) }}</td>
                  <td class="py-2 px-3 text-right">{{ nf(v.ventes) }}</td>
                  <td class="py-2 px-3 text-right">{{ nf(v.montant) }}</td>
                </tr>
              }
              <tr>
                <td class="py-2 px-3">Offres anti-gaspi</td>
                <td class="py-2 px-3 text-right">{{ nf(d.offresFinService.ventes) }}</td>
                <td class="py-2 px-3 text-right">{{ nf(d.offresFinService.montant) }}</td>
              </tr>
            </tbody>
          </table>
        </app-card>

        <app-card>
          <h2 class="font-bold text-gray-800">Gaspillage évité</h2>
          <p class="text-xs text-gray-500 mb-4">Offres de fin de service sur la période</p>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-xl bg-green-50 py-4">
              <p class="text-2xl font-bold text-success">{{ d.gaspillageEvite.kg }}</p>
              <p class="text-xs text-gray-600">kg sauvés</p>
            </div>
            <div class="rounded-xl bg-[#e7f3fc] py-4">
              <p class="text-2xl font-bold text-vatel-primary-dark">
                {{ d.gaspillageEvite.repas }}
              </p>
              <p class="text-xs text-gray-600">repas à prix réduit</p>
            </div>
            <div class="rounded-xl bg-amber-50 py-4">
              <p class="text-2xl font-bold text-warning">{{ d.gaspillageEvite.offres }}</p>
              <p class="text-xs text-gray-600">jours d'offre</p>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 class="font-bold text-gray-800">Notes des plats</h2>
              <p class="text-xs text-gray-500">Avis des élèves, du mieux noté au moins bien noté</p>
            </div>
            <button
              type="button"
              (click)="exporterNotes()"
              class="px-3 py-1.5 rounded-lg border border-vatel-primary text-vatel-primary text-xs font-semibold hover:bg-[#e7f3fc]"
            >
              <i class="pi pi-download mr-1" aria-hidden="true"></i>Exporter CSV
            </button>
          </div>
          @for (n of d.notesPlats; track n.plat) {
            <div
              class="flex items-center gap-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
            >
              <span class="flex-1 truncate text-gray-800">{{ n.plat }}</span>
              <span class="text-amber-400 text-xs" aria-hidden="true">{{ etoiles(n.note) }}</span>
              <span class="w-10 text-right font-semibold">{{ n.note }}</span>
              <span class="w-16 text-right text-xs text-gray-500">{{ n.avis }} avis</span>
            </div>
          } @empty {
            <p class="text-sm text-gray-400">Aucun avis pour l'instant.</p>
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
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-skeleton height="76px" radius="12px" />
        }
      </div>
      <app-skeleton height="300px" radius="12px" />
    }
  `,
})
export class RapportsComponent implements OnInit {
  private api = inject(CantineApi);

  readonly presets: { code: Preset; libelle: string }[] = [
    { code: '7j', libelle: '7 jours' },
    { code: 'mois', libelle: 'Ce mois' },
    { code: 'trimestre', libelle: 'Trimestre' },
  ];
  readonly nf = fcfa;

  private aujourdhui = iso(new Date());
  preset = signal<Preset>('mois');
  debut = signal(`${this.aujourdhui.slice(0, 7)}-01`);
  fin = signal(this.aujourdhui);
  donnees = signal<Synthese | null>(null);
  erreur = signal('');

  private max = computed(() =>
    Math.max(1, ...(this.donnees()?.frequentation ?? []).map((s) => s.repas)),
  );

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.api.synthese(this.debut(), this.fin()).subscribe({
      next: (d) => {
        this.donnees.set(d);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
  }

  choisir(p: Preset): void {
    this.preset.set(p);
    this.fin.set(this.aujourdhui);
    this.debut.set(
      p === '7j'
        ? decaler(this.aujourdhui, -6)
        : p === 'trimestre'
          ? decaler(this.aujourdhui, -89)
          : `${this.aujourdhui.slice(0, 7)}-01`,
    );
    this.donnees.set(null);
    this.charger();
  }

  saisir(debut: string | null, fin: string | null): void {
    if (debut) this.debut.set(debut);
    if (fin) this.fin.set(fin);
    this.preset.set('perso');
    if (this.debut() <= this.fin()) {
      this.donnees.set(null);
      this.charger();
    }
  }

  hauteur(n: number): number {
    return Math.round((n / this.max()) * 100);
  }

  moyen(m: string | null): string {
    return m ? (MOYENS[m] ?? m) : '—';
  }

  categorie(c: string): string {
    return CATEGORIES[c] ?? c;
  }

  etoiles(note: number): string {
    const n = Math.round(note);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  exporterFrequentation(): void {
    const d = this.donnees();
    if (d)
      telechargerCsv(
        'frequentation.csv',
        ['Semaine du', 'au', 'Repas servis'],
        d.frequentation.map((s) => [s.debut, s.fin, s.repas]),
      );
  }

  exporterRecettes(): void {
    const d = this.donnees();
    if (!d) return;
    telechargerCsv(
      'recettes-recharges.csv',
      ['Rubrique', 'Libellé', 'Montant (FCFA)', 'Part (%) / Ventes'],
      [
        ...d.recharges.parMoyen.map(
          (m) =>
            ['Recharge', this.moyen(m.moyen), m.montant, m.pourcentage] as (
              string | number | null
            )[],
        ),
        ...d.ventes.map(
          (v) =>
            ['Vente', this.categorie(v.categorie), v.montant, v.ventes] as (
              string | number | null
            )[],
        ),
        ['Vente', 'Offres anti-gaspi', d.offresFinService.montant, d.offresFinService.ventes],
      ],
    );
  }

  exporterNotes(): void {
    const d = this.donnees();
    if (d)
      telechargerCsv(
        'notes-plats.csv',
        ['Plat', 'Note moyenne', 'Avis'],
        d.notesPlats.map((n) => [n.plat, n.note, n.avis]),
      );
  }

  toutExporter(): void {
    const d = this.donnees();
    if (!d) return;
    telechargerCsv(
      `rapport-${d.periode.debut}-${d.periode.fin}.csv`,
      ['Indicateur', 'Valeur'],
      [
        ['Période', `${d.periode.debut} → ${d.periode.fin}`],
        ['Repas servis', d.repasServis.total],
        ['Présence (%)', d.repasServis.presence],
        ['Recettes (FCFA)', d.recettes.total],
        ['Ticket moyen (FCFA)', d.recettes.ticketMoyen],
        ['Gaspillage évité (kg)', d.gaspillageEvite.kg],
        ['Repas sauvés', d.gaspillageEvite.repas],
        ['Note moyenne', d.satisfaction.moyenne],
        ['Avis', d.satisfaction.avis],
        ['Recharges (FCFA)', d.recharges.total],
      ],
    );
  }
}
