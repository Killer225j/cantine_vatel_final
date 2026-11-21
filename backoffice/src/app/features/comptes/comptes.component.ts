import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { CantineApi, Comptes, EleveCompte } from '../../core/services/cantine-api.service';
import { ToastService } from '../../core/services/toast.service';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { StatTileComponent } from '../../shared/components/ui/stat-tile/stat-tile.component';

type Onglet = 'eleves' | 'parents' | 'personnel';

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');

const ROLES = [
  { code: 'ELEVE', libelle: 'Élève' },
  { code: 'PARENT', libelle: 'Parent' },
  { code: 'CUISINE', libelle: 'Cuisine' },
  { code: 'ADMIN', libelle: 'Administration' },
];

@Component({
  selector: 'app-comptes',
  standalone: true,
  imports: [FormsModule, CardComponent, EmptyStateComponent, SkeletonComponent, StatTileComponent],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-800">Comptes</h1>
        <p class="text-sm text-vatel-primary mt-0.5">
          Élèves, parents et personnel. Les parents suivent les repas et rechargent le portefeuille
          de leurs enfants.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="ouvrirLien(null)"
          class="px-3.5 py-2 rounded-lg border border-vatel-primary text-vatel-primary text-sm font-semibold hover:bg-[#e7f3fc]"
        >
          <i class="pi pi-link mr-1.5" aria-hidden="true"></i>Lier un parent
        </button>
        <button
          type="button"
          (click)="ouvrirInvitation()"
          class="px-3.5 py-2 rounded-lg bg-vatel-primary text-white text-sm font-semibold hover:bg-vatel-primary-dark"
        >
          <i class="pi pi-user-plus mr-1.5" aria-hidden="true"></i>Inviter un compte
        </button>
      </div>
    </div>

    @if (donnees(); as d) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <app-stat-tile [value]="d.compteurs.eleves" label="Élèves" icon="pi-graduation-cap" />
        <app-stat-tile [value]="d.compteurs.parentsLies" label="Parents liés" icon="pi-users" />
        <app-stat-tile
          [value]="d.compteurs.elevesAvecAllergie"
          label="Élèves avec allergie"
          icon="pi-exclamation-triangle"
        />
        <app-stat-tile
          [value]="d.compteurs.soldesBas"
          label="Soldes sous 2 000 FCFA"
          icon="pi-wallet"
        />
      </div>

      <app-card>
        <div class="flex flex-wrap items-center gap-x-1 border-b border-gray-200 mb-3 -mt-1">
          @for (o of onglets(); track o.code) {
            <button
              type="button"
              (click)="onglet.set(o.code)"
              class="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px"
              [class]="
                onglet() === o.code
                  ? 'border-vatel-primary text-vatel-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              "
              [attr.aria-pressed]="onglet() === o.code"
            >
              <i class="pi {{ o.icone }} text-sm" aria-hidden="true"></i>{{ o.libelle }}
              <span class="text-[11px] rounded-full px-1.5 bg-gray-100 text-gray-600">{{
                o.n
              }}</span>
            </button>
          }
          <div class="relative w-full sm:w-auto sm:ml-auto mb-1">
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
              aria-hidden="true"
            ></i>
            <input
              type="search"
              placeholder="Rechercher…"
              aria-label="Rechercher un compte"
              [ngModel]="recherche()"
              (ngModelChange)="recherche.set($event)"
              class="border border-gray-300 rounded-full pl-9 pr-3 py-1.5 text-sm w-full sm:w-52 focus:outline-none focus:border-vatel-primary"
            />
          </div>
        </div>

        @if (onglet() === 'eleves') {
          @if (eleves().length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th class="py-2 pr-3 font-semibold">Élève</th>
                    <th class="py-2 pr-3 font-semibold">Classe</th>
                    <th class="py-2 pr-3 font-semibold">Allergies</th>
                    <th class="py-2 pr-3 font-semibold text-right">Solde</th>
                    <th class="py-2 pr-3 font-semibold">Parents liés</th>
                    <th class="py-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of eleves(); track e.id) {
                    <tr class="border-b border-gray-100" [class.opacity-60]="!e.actif">
                      <td class="py-2.5 pr-3">
                        <div class="flex items-center gap-2.5">
                          <span
                            class="w-8 h-8 rounded-full bg-[#e7f3fc] text-vatel-primary-dark text-xs font-bold inline-flex items-center justify-center shrink-0"
                            >{{ ini(e.nom) }}</span
                          >
                          <div class="min-w-0">
                            <p class="font-semibold text-gray-800 leading-tight">{{ e.nom }}</p>
                            <p class="text-[11px] text-gray-500 truncate">{{ e.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 pr-3 text-gray-700">{{ e.classe ?? '—' }}</td>
                      <td class="py-2.5 pr-3">
                        @for (a of e.allergenes; track a.code) {
                          <span
                            class="text-[11px] rounded-full px-2 py-0.5 font-medium mr-1"
                            [class]="
                              a.code === 'ARACHIDES'
                                ? 'bg-red-50 text-error border border-red-100'
                                : 'bg-amber-50 text-warning border border-amber-100'
                            "
                            >{{ a.nom }}</span
                          >
                        } @empty {
                          <span class="text-gray-400">—</span>
                        }
                      </td>
                      <td class="py-2.5 pr-3 text-right whitespace-nowrap">
                        <span class="font-semibold">{{ fcfa(e.solde) }}</span>
                        @if (e.soldeBas) {
                          <span
                            class="ml-1.5 text-[11px] rounded-full px-2 py-0.5 bg-amber-50 text-warning font-semibold"
                            >Solde bas</span
                          >
                        }
                      </td>
                      <td class="py-2.5 pr-3">
                        @for (p of e.parents; track p.id) {
                          <span
                            class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-[#e7f3fc] text-vatel-primary-dark font-medium mr-1"
                            ><i class="pi pi-link text-[9px]" aria-hidden="true"></i
                            >{{ p.nom }}</span
                          >
                        } @empty {
                          <button
                            type="button"
                            (click)="ouvrirLien(e)"
                            class="text-xs font-semibold text-vatel-primary hover:underline"
                          >
                            <i class="pi pi-plus text-[10px] mr-1" aria-hidden="true"></i>Lier un
                            parent
                          </button>
                        }
                      </td>
                      <td class="py-2.5 whitespace-nowrap">
                        <span
                          class="text-xs font-semibold rounded-full px-2.5 py-1"
                          [class]="
                            e.actif ? 'bg-green-50 text-success' : 'bg-gray-100 text-gray-500'
                          "
                          >{{ e.actif ? 'Actif' : 'Désactivé' }}</span
                        >
                        <button
                          type="button"
                          (click)="basculer(e.id, e.actif)"
                          class="ml-2 w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:text-error hover:border-error"
                          [attr.aria-label]="(e.actif ? 'Désactiver ' : 'Réactiver ') + e.nom"
                          [title]="e.actif ? 'Désactiver' : 'Réactiver'"
                        >
                          <i
                            class="pi text-[11px]"
                            [class]="e.actif ? 'pi-ban' : 'pi-replay'"
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
              title="Aucun élève"
              message="Aucun élève ne correspond à la recherche."
            />
          }
        }

        @if (onglet() === 'parents') {
          @if (parents().length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th class="py-2 pr-3 font-semibold">Parent</th>
                    <th class="py-2 pr-3 font-semibold">Téléphone</th>
                    <th class="py-2 pr-3 font-semibold">Enfants suivis</th>
                    <th class="py-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of parents(); track p.id) {
                    <tr class="border-b border-gray-100" [class.opacity-60]="!p.actif">
                      <td class="py-2.5 pr-3">
                        <div class="flex items-center gap-2.5">
                          <span
                            class="w-8 h-8 rounded-full bg-[#e7f3fc] text-vatel-primary-dark text-xs font-bold inline-flex items-center justify-center shrink-0"
                            >{{ ini(p.nom) }}</span
                          >
                          <div>
                            <p class="font-semibold text-gray-800 leading-tight">{{ p.nom }}</p>
                            <p class="text-[11px] text-gray-500">{{ p.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 pr-3 text-gray-700">{{ p.telephone ?? '—' }}</td>
                      <td class="py-2.5 pr-3">
                        @for (c of p.enfants; track c.id) {
                          <span
                            class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-[#e7f3fc] text-vatel-primary-dark font-medium mr-1"
                            ><i class="pi pi-link text-[9px]" aria-hidden="true"></i
                            >{{ c.nom }}</span
                          >
                        } @empty {
                          <span class="text-gray-400">Aucun enfant lié</span>
                        }
                      </td>
                      <td class="py-2.5 whitespace-nowrap">
                        <span
                          class="text-xs font-semibold rounded-full px-2.5 py-1"
                          [class]="
                            p.actif ? 'bg-green-50 text-success' : 'bg-gray-100 text-gray-500'
                          "
                          >{{ p.actif ? 'Actif' : 'Désactivé' }}</span><button
                          type="button"
                          (click)="basculer(p.id, p.actif)"
                          class="ml-2 w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:text-error hover:border-error"
                          [attr.aria-label]="(p.actif ? 'Désactiver ' : 'Réactiver ') + p.nom"
                        >
                          <i
                            class="pi text-[11px]"
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
              title="Aucun parent"
              message="Aucun parent ne correspond à la recherche."
            />
          }
        }

        @if (onglet() === 'personnel') {
          @if (personnel().length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th class="py-2 pr-3 font-semibold">Membre</th>
                    <th class="py-2 pr-3 font-semibold">Rôle</th>
                    <th class="py-2 pr-3 font-semibold">Accès</th>
                    <th class="py-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of personnel(); track m.id) {
                    <tr class="border-b border-gray-100" [class.opacity-60]="!m.actif">
                      <td class="py-2.5 pr-3">
                        <div class="flex items-center gap-2.5">
                          <span
                            class="w-8 h-8 rounded-full bg-[#e7f3fc] text-vatel-primary-dark text-xs font-bold inline-flex items-center justify-center shrink-0"
                            >{{ ini(m.nom) }}</span
                          >
                          <div>
                            <p class="font-semibold text-gray-800 leading-tight">{{ m.nom }}</p>
                            <p class="text-[11px] text-gray-500">{{ m.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 pr-3">
                        {{ m.role === 'ADMIN' ? 'Administration' : 'Cuisine' }}
                      </td>
                      <td class="py-2.5 pr-3 text-gray-600 text-xs">
                        {{
                          m.role === 'ADMIN'
                            ? 'Menus, plats, comptes, rapports, comptoir'
                            : 'Commandes, comptoir, anti-gaspi, stocks'
                        }}
                      </td>
                      <td class="py-2.5 whitespace-nowrap">
                        <span
                          class="text-xs font-semibold rounded-full px-2.5 py-1"
                          [class]="
                            m.actif ? 'bg-green-50 text-success' : 'bg-gray-100 text-gray-500'
                          "
                          >{{ m.actif ? 'Actif' : 'Désactivé' }}</span><button
                          type="button"
                          (click)="basculer(m.id, m.actif)"
                          class="ml-2 w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:text-error hover:border-error"
                          [attr.aria-label]="(m.actif ? 'Désactiver ' : 'Réactiver ') + m.nom"
                        >
                          <i
                            class="pi text-[11px]"
                            [class]="m.actif ? 'pi-ban' : 'pi-replay'"
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
              title="Aucun membre"
              message="Aucun membre ne correspond à la recherche."
            />
          }
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
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-skeleton height="76px" radius="12px" />
        }
      </div>
      <app-skeleton height="320px" radius="12px" />
    }

    <!-- Lier un parent -->
    @if (lien(); as l) {
      <div
        class="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-3"
        (click)="lien.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lien-titre"
        >
          <div
            class="shrink-0 flex items-center justify-between px-5 pt-4 pb-2.5 border-b border-gray-100"
          >
            <h3 id="lien-titre" class="text-lg font-bold text-gray-800">Lier un parent</h3>
            <button
              type="button"
              (click)="lien.set(null)"
              class="w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Fermer"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="lien-parent"
                >Parent</label
              >
              <select
                id="lien-parent"
                [(ngModel)]="l.parentId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Choisir un parent…</option>
                @for (p of donnees()!.parents; track p.id) {
                  <option [value]="p.id">{{ p.nom }} — {{ p.email }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1" for="lien-eleve"
                >Élève</label
              >
              <select
                id="lien-eleve"
                [(ngModel)]="l.enfantId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Choisir un élève…</option>
                @for (e of donnees()!.eleves; track e.id) {
                  <option [value]="e.id">{{ e.nom }} — {{ e.classe ?? '—' }}</option>
                }
              </select>
            </div>
          </div>
          <div class="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              (click)="lien.set(null)"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              [disabled]="!l.parentId || !l.enfantId || occupe()"
              (click)="lier()"
              class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
            >
              <i class="pi pi-link mr-1.5" aria-hidden="true"></i>Lier
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Inviter un compte -->
    @if (invitation(); as v) {
      <div
        class="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-3"
        (click)="invitation.set(null)"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-titre"
        >
          <div
            class="shrink-0 flex items-center justify-between px-5 pt-4 pb-2.5 border-b border-gray-100"
          >
            <h3 id="inv-titre" class="text-lg font-bold text-gray-800">
              {{ resultat() ? 'Compte créé' : 'Inviter un compte' }}
            </h3>
            <button
              type="button"
              (click)="invitation.set(null)"
              class="w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Fermer"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            @if (resultat(); as r) {
              <p class="text-sm text-gray-700">
                Transmettez ces accès à la personne : le mot de passe temporaire ne sera plus
                affiché.
              </p>
              <div class="rounded-lg bg-[#e7f3fc] px-4 py-3 text-sm space-y-1">
                <p>
                  <span class="text-gray-500">Email :</span> <b>{{ r.email }}</b>
                </p>
                <p>
                  <span class="text-gray-500">Mot de passe temporaire :</span>
                  <b class="font-mono">{{ r.motDePasseTemporaire }}</b>
                </p>
                @if (r.codeLiaison) {
                  <p>
                    <span class="text-gray-500">Code de liaison parent :</span>
                    <b class="font-mono">{{ r.codeLiaison }}</b>
                  </p>
                }
              </div>
            } @else {
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1" for="inv-prenom"
                    >Prénom</label
                  ><input
                    id="inv-prenom"
                    [(ngModel)]="v.prenom"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1" for="inv-nom"
                    >Nom</label
                  ><input
                    id="inv-nom"
                    [(ngModel)]="v.nom"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1" for="inv-email"
                  >Email</label
                ><input
                  id="inv-email"
                  type="email"
                  [(ngModel)]="v.email"
                  placeholder="prenom.nom@vatel.ci"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1" for="inv-role"
                    >Rôle</label
                  ><select
                    id="inv-role"
                    [(ngModel)]="v.role"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    @for (r of roles; track r.code) {
                      <option [value]="r.code">{{ r.libelle }}</option>
                    }
                  </select>
                </div>
                @if (v.role === 'ELEVE') {
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1" for="inv-classe"
                      >Classe</label
                    ><input
                      id="inv-classe"
                      [(ngModel)]="v.classe"
                      placeholder="Bachelor 1"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                }
              </div>
            }
          </div>
          <div class="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
            @if (resultat()) {
              <button
                type="button"
                (click)="invitation.set(null)"
                class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark"
              >
                Terminer
              </button>
            } @else {
              <button
                type="button"
                (click)="invitation.set(null)"
                class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                [disabled]="!invitationValide() || occupe()"
                (click)="inviter()"
                class="px-4 py-2 rounded-lg bg-vatel-primary text-white font-semibold hover:bg-vatel-primary-dark disabled:opacity-50"
              >
                <i class="pi pi-user-plus mr-1.5" aria-hidden="true"></i>Créer le compte
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ComptesComponent implements OnInit {
  private api = inject(CantineApi);
  private toast = inject(ToastService);

  readonly roles = ROLES;
  readonly ini = initiales;
  fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  donnees = signal<Comptes | null>(null);
  erreur = signal('');
  occupe = signal(false);
  onglet = signal<Onglet>('eleves');
  recherche = signal('');
  lien = signal<{ parentId: string; enfantId: string } | null>(null);
  invitation = signal<{
    prenom: string;
    nom: string;
    email: string;
    role: string;
    classe: string;
  } | null>(null);
  resultat = signal<{
    email: string;
    motDePasseTemporaire: string;
    codeLiaison: string | null;
  } | null>(null);

  onglets = computed(() => [
    {
      code: 'eleves' as const,
      libelle: 'Élèves',
      icone: 'pi-graduation-cap',
      n: this.donnees()?.eleves.length ?? 0,
    },
    {
      code: 'parents' as const,
      libelle: 'Parents',
      icone: 'pi-users',
      n: this.donnees()?.parents.length ?? 0,
    },
    {
      code: 'personnel' as const,
      libelle: 'Personnel',
      icone: 'pi-building',
      n: this.donnees()?.personnel.length ?? 0,
    },
  ]);

  private filtrer<T extends { nom: string; email: string }>(liste: T[] | undefined): T[] {
    const q = this.recherche().trim().toLowerCase();
    return (liste ?? []).filter(
      (x) => !q || x.nom.toLowerCase().includes(q) || x.email.toLowerCase().includes(q),
    );
  }
  eleves = computed(() => this.filtrer(this.donnees()?.eleves));
  parents = computed(() => this.filtrer(this.donnees()?.parents));
  personnel = computed(() => this.filtrer(this.donnees()?.personnel));

  // Méthode (et non computed) : le formulaire est modifié en place par ngModel.
  invitationValide(): boolean {
    const v = this.invitation();
    return (
      !!v &&
      v.prenom.trim().length > 0 &&
      v.nom.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(v.email) &&
      (v.role !== 'ELEVE' || v.classe.trim().length > 0)
    );
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.api.comptes().subscribe({
      next: (d) => {
        this.donnees.set(d);
        this.erreur.set('');
      },
      error: () => this.erreur.set('Le serveur ne répond pas. Réessayez dans un instant.'),
    });
  }

  ouvrirLien(eleve: EleveCompte | null): void {
    this.lien.set({ parentId: '', enfantId: eleve?.id ?? '' });
  }

  ouvrirInvitation(): void {
    this.resultat.set(null);
    this.invitation.set({ prenom: '', nom: '', email: '', role: 'ELEVE', classe: '' });
  }

  async lier(): Promise<void> {
    const l = this.lien();
    if (!l) return;
    this.occupe.set(true);
    try {
      await lastValueFrom(this.api.lierParent(l.parentId, l.enfantId));
      this.toast.success('Parent lié à l’élève.');
      this.lien.set(null);
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  async inviter(): Promise<void> {
    const v = this.invitation();
    if (!v || !this.invitationValide()) return;
    this.occupe.set(true);
    try {
      const r = await lastValueFrom(
        this.api.inviter({
          prenom: v.prenom,
          nom: v.nom,
          email: v.email,
          role: v.role,
          classe: v.role === 'ELEVE' ? v.classe : undefined,
        }),
      );
      this.resultat.set({
        email: r.data.email,
        motDePasseTemporaire: r.data.motDePasseTemporaire,
        codeLiaison: r.data.codeLiaison,
      });
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    } finally {
      this.occupe.set(false);
    }
  }

  async basculer(id: string, actif: boolean): Promise<void> {
    try {
      await lastValueFrom(this.api.definirActif(id, !actif));
      this.toast.success(actif ? 'Compte désactivé.' : 'Compte réactivé.');
      this.charger();
    } catch {
      /* message affiché par l'intercepteur */
    }
  }
}
