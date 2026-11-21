import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CantineApi, Commandes, Reservation, heure } from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';

interface Refus {
  reason: string;
  titre: string;
  message: string;
}

/** Le code est refusé : on dit pourquoi, en toutes lettres, pour ne pas servir par erreur. */
function lireRefus(err: unknown): Refus {
  const corps = (err as { error?: { error?: { reason?: string; message?: string } } })?.error
    ?.error;
  const reason = corps?.reason ?? '';
  const titres: Record<string, string> = {
    DEJA_SERVIE: 'Code déjà utilisé : ne pas servir',
    CODE_INCONNU: 'Code introuvable',
    PAS_AUJOURDHUI: 'Ce repas n’est pas pour aujourd’hui',
    RESERVATION_ANNULEE: 'Réservation annulée : ne pas servir',
  };
  return {
    reason,
    titre: titres[reason] ?? 'Code refusé',
    message: corps?.message ?? 'Le serveur ne répond pas. Réessayez.',
  };
}

@Component({
  selector: 'app-comptoir',
  standalone: true,
  imports: [DatePipe, FormsModule, BadgeComponent, CardComponent],
  template: `
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-gray-800">Comptoir</h1>
      <p class="text-sm text-vatel-primary mt-0.5">
        Vérifier un code de réservation avant de servir (saisie manuelle).
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <app-card>
          <form class="flex flex-wrap gap-2" (ngSubmit)="verifier()">
            <input
              name="code"
              [ngModel]="code()"
              (ngModelChange)="code.set($event)"
              placeholder="RV-XXXX-XXXX-XXXX"
              autocomplete="off"
              autofocus
              class="flex-1 min-w-56 border border-gray-300 rounded-lg px-4 py-3 text-lg font-mono tracking-wide uppercase focus:outline-none focus:border-vatel-primary"
            />
            <button
              type="submit"
              [disabled]="!code().trim() || enCours()"
              class="px-6 py-3 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              {{ enCours() ? 'Vérification…' : 'Vérifier' }}
            </button>
          </form>
        </app-card>

        @if (refus(); as r) {
          <div class="rounded-xl border-2 border-error bg-red-50 p-5" role="alert">
            <p class="text-lg font-bold text-error">
              <i class="pi pi-times-circle mr-2"></i>{{ r.titre }}
            </p>
            <p class="text-sm text-gray-700 mt-1">{{ r.message }}</p>
            <button
              type="button"
              class="mt-3 underline text-sm font-semibold text-error"
              (click)="suivant()"
            >
              Scan suivant
            </button>
          </div>
        }

        @if (resultat(); as r) {
          @if (servie()) {
            <div class="rounded-xl border-2 border-success bg-green-50 p-5">
              <p class="text-lg font-bold text-success">
                <i class="pi pi-check-circle mr-2"></i>Servi : {{ r.eleve.nom }}
              </p>
              <p class="text-sm text-gray-700 mt-1">
                {{ r.plat.nom }} · {{ h(r.creneau.heureDebut) }}
              </p>
              <button
                type="button"
                class="mt-3 px-4 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold"
                (click)="suivant()"
              >
                Scan suivant
              </button>
            </div>
          } @else {
            <div
              class="rounded-xl border-2 p-5"
              [class.border-error]="r.alertesAllergie.length"
              [class.bg-red-50]="r.alertesAllergie.length"
              [class.border-success]="!r.alertesAllergie.length"
              [class.bg-green-50]="!r.alertesAllergie.length"
            >
              @if (r.alertesAllergie.length) {
                <p class="text-xl font-extrabold text-error mb-2">
                  <i class="pi pi-exclamation-triangle mr-2"></i>ALLERGIE : {{ noms(r) }}
                </p>
                <p class="text-sm text-gray-700 mb-3">
                  Ce plat contient un allergène déclaré par l'élève. Contrôlez avant de servir.
                </p>
              } @else {
                <p class="text-lg font-bold text-success mb-2">
                  <i class="pi pi-check-circle mr-2"></i>Réservation valide
                </p>
              }

              <div class="flex items-center gap-4 bg-white rounded-lg p-4 mb-3">
                <span
                  class="w-12 h-12 rounded-full bg-[#e7f3fc] text-vatel-primary-dark font-bold flex items-center justify-center"
                  >{{ r.eleve.initiales }}</span
                >
                <div class="flex-1">
                  <p class="font-bold text-gray-800">
                    {{ r.eleve.nom }}
                    <span class="font-normal text-gray-500">· {{ r.eleve.classe || '—' }}</span>
                  </p>
                  <p class="text-sm text-gray-700">
                    {{ r.plat.nom }} · créneau {{ h(r.creneau.heureDebut) }}
                  </p>
                </div>
                <span class="font-mono text-xs text-gray-500">{{ r.code }}</span>
              </div>

              @if (r.alertesAllergie.length) {
                <label class="flex items-start gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    [ngModel]="controle1()"
                    (ngModelChange)="controle1.set($event)"
                    class="mt-1"
                  />
                  J'ai vérifié que le plat servi ne contient pas l'allergène ({{ noms(r) }}).
                </label>
                <label class="flex items-start gap-2 text-sm mb-3">
                  <input
                    type="checkbox"
                    [ngModel]="controle2()"
                    (ngModelChange)="controle2.set($event)"
                    class="mt-1"
                  />
                  J'ai prévenu l'élève ou son parent.
                </label>
              }

              <div class="flex gap-2">
                <button
                  type="button"
                  [disabled]="!peutServir() || enCours()"
                  (click)="servir(r)"
                  class="px-5 py-2.5 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
                >
                  Marquer servie
                </button>
                <button
                  type="button"
                  (click)="suivant()"
                  class="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                >
                  Refuser le service
                </button>
              </div>
            </div>
          }
        }

        @if (!resultat() && !refus()) {
          <app-card>
            <p class="text-center text-gray-500 py-8">
              <i class="pi pi-qrcode text-3xl block mb-2 text-vatel-primary-light"></i>En attente
              d'un code
            </p>
          </app-card>
        }
      </div>

      <div class="space-y-4">
        <app-card>
          <h3 class="font-bold text-gray-800 mb-3">Aujourd'hui</h3>
          <div class="grid grid-cols-2 gap-3 text-center">
            <div>
              <p class="text-2xl font-bold text-success">
                {{ commandes()?.compteurs?.servies ?? '—' }}
              </p>
              <p class="text-xs text-gray-500">Servis</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-vatel-primary">
                {{ commandes()?.compteurs?.aServir ?? '—' }}
              </p>
              <p class="text-xs text-gray-500">Restants</p>
            </div>
          </div>
        </app-card>
        <app-card>
          <h3 class="font-bold text-gray-800 mb-3">Derniers passages</h3>
          @for (p of derniers(); track p.id) {
            <div
              class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm"
            >
              <span>{{ p.eleve.nom }}</span>
              <span class="text-gray-500">{{ p.servieLe | date: 'HH:mm' }}</span>
            </div>
          } @empty {
            <p class="text-sm text-gray-400">Aucun repas servi pour l'instant.</p>
          }
        </app-card>
      </div>
    </div>
  `,
})
export class ComptoirComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);

  readonly h = heure;
  code = signal('');
  enCours = signal(false);
  resultat = signal<Reservation | null>(null);
  refus = signal<Refus | null>(null);
  servie = signal(false);
  controle1 = signal(false);
  controle2 = signal(false);
  commandes = signal<Commandes | null>(null);

  peutServir = computed(() => {
    const r = this.resultat();
    if (!r) return false;
    return r.alertesAllergie.length === 0 || (this.controle1() && this.controle2());
  });

  derniers = computed(() =>
    (this.commandes()?.reservations ?? [])
      .filter((r) => r.statut === 'SERVIE' && r.servieLe)
      .sort((a, b) => (b.servieLe ?? '').localeCompare(a.servieLe ?? ''))
      .slice(0, 6),
  );

  ngOnInit(): void {
    this.actualiser();
  }

  noms(r: Reservation): string {
    return r.alertesAllergie.map((a) => a.nom.toUpperCase()).join(', ');
  }

  verifier(): void {
    const code = this.code().trim();
    if (!code) return;
    this.enCours.set(true);
    this.refus.set(null);
    this.resultat.set(null);
    this.servie.set(false);
    this.controle1.set(false);
    this.controle2.set(false);
    this.api.scanner(code).subscribe({
      next: (r) => {
        this.resultat.set(r);
        this.enCours.set(false);
      },
      error: (e) => {
        this.refus.set(lireRefus(e));
        this.enCours.set(false);
      },
    });
  }

  servir(r: Reservation): void {
    this.enCours.set(true);
    this.api.servir(r.id, r.alertesAllergie.length > 0).subscribe({
      next: () => {
        this.servie.set(true);
        this.enCours.set(false);
        this.actualiser();
      },
      error: () => {
        this.enCours.set(false);
        this.toast.error('Le repas n’a pas pu être marqué servi. Vérifiez le code.');
      },
    });
  }

  suivant(): void {
    this.code.set('');
    this.resultat.set(null);
    this.refus.set(null);
    this.servie.set(false);
  }

  private actualiser(): void {
    this.api
      .commandes({})
      .subscribe({ next: (c) => this.commandes.set(c), error: () => undefined });
  }
}
