import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SILENT_HTTP_ERROR } from '../interceptors/silent-error.token';

/** L'API enveloppe chaque réponse : { success, data, meta? }. */
interface Enveloppe<T> {
  data: T;
  meta?: Meta;
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export type Categorie = 'ENTREE' | 'PLAT' | 'DESSERT' | 'BOISSON';
export type StatutReservation = 'CONFIRMEE' | 'SERVIE' | 'ANNULEE' | 'ABSENT';

export const CATEGORIES: { code: Categorie; libelle: string }[] = [
  { code: 'ENTREE', libelle: 'Entrée' },
  { code: 'PLAT', libelle: 'Plat' },
  { code: 'DESSERT', libelle: 'Dessert' },
  { code: 'BOISSON', libelle: 'Boisson' },
];

export interface Allergene {
  code: string;
  nom: string;
}

export interface Plat {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  categorie: Categorie;
  prix: number;
  photoUrl: string | null;
  vegetarien: boolean;
  poidsPortionG: number | null;
  actif: boolean;
  allergenes: Allergene[];
  noteMoyenne: number | null;
  nbAvis: number;
  /** Repas servis depuis le début du mois (renvoyé par la liste des plats). */
  servisMois?: number;
}

export interface ItemMenu {
  id: string;
  portionsPrevues: number | null;
  prixAntiGaspi: number | null;
  antiGaspiJusqua: string | null;
  plat: Plat;
  incompatible: boolean;
}

export interface JourMenu {
  date: string;
  publie: boolean;
  menuId: string | null;
  items: ItemMenu[];
}

export interface Semaine {
  lundi: string;
  jours: JourMenu[];
}

export interface Creneau {
  id: string;
  heureDebut: string;
  heureFin: string;
  capacite: number;
  reserves: number;
  placesRestantes: number;
  remplissage: number;
  complet: boolean;
}

export interface Reservation {
  id: string;
  code: string;
  date: string;
  statut: StatutReservation;
  prix: number;
  antiGaspi: boolean;
  servieLe: string | null;
  servieePar: string | null;
  controleAllergie: boolean;
  plat: { id: string; nom: string; categorie: Categorie };
  creneau: { id: string; heureDebut: string; heureFin: string };
  eleve: {
    id: string;
    nom: string;
    initiales: string;
    classe: string | null;
    allergenes: Allergene[];
  };
  alertesAllergie: Allergene[];
}

export interface Commandes {
  date: string;
  compteurs: {
    total: number;
    servies: number;
    aServir: number;
    absents: number;
    annulees: number;
    aRisqueAllergique: number;
  };
  reservations: Reservation[];
}

export interface AlerteAllergie {
  eleve: string;
  plat: string;
  creneau: string;
  statut: StatutReservation;
  allergenes: Allergene[];
}

export interface StatsJour {
  date: string;
  menuPublie: boolean;
  reserves: number;
  evolutionSemaineDerniere: number;
  servies: number;
  absents: number;
  tauxAbsence: number;
  tauxPresence: number;
  portionsAPreparer: number;
  kgSauvesMois: number;
  repasSauvesMois: number;
  affluence: { capacite: number; reserves: number; creneauxComplets: number; creneaux: Creneau[] };
  alertesAllergie: AlerteAllergie[];
}

export interface JourReservations {
  date: string;
  reservees: number;
  servies: number;
  absents: number;
}

export interface LignePrevision {
  menuItemId: string;
  plat: { nom: string; categorie: Categorie };
  reserves: number;
  absentsPrevus: number;
  aPreparer: number;
  portionsPrevues: number | null;
}

export interface Prevision {
  date: string;
  tauxAbsence: number;
  plats: LignePrevision[];
  total?: { reserves: number; absentsPrevus: number; aPreparer: number };
}

export interface FormulairePlat {
  nom: string;
  categorie: Categorie;
  prix: number;
  description?: string;
  poidsPortionG?: number | null;
  vegetarien?: boolean;
  photoUrl?: string | null;
  allergenes?: string[];
}

// ─── Stocks ───
export type StatutStock = 'OK' | 'BAS' | 'RUPTURE';

export interface ArticleStock {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  seuilAlerte: number;
  statut: StatutStock;
  niveau: number;
}

export interface MouvementStockVue {
  id: string;
  article: string;
  unite: string;
  delta: number;
  motif: string;
  creeLe: string;
}

export interface Stocks {
  compteurs: { suivis: number; sousSeuil: number; rupture: number; mouvementsSemaine: number };
  articles: ArticleStock[];
  mouvements: MouvementStockVue[];
}

// ─── Comptes ───
export interface EleveCompte {
  id: string;
  nom: string;
  email: string;
  classe: string | null;
  allergenes: Allergene[];
  solde: number;
  seuilAlerte: number;
  soldeBas: boolean;
  codeLiaison: string | null;
  parents: { id: string; nom: string }[];
  actif: boolean;
}

export interface ParentCompte {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  enfants: { id: string; nom: string }[];
  actif: boolean;
}

export interface PersonnelCompte {
  id: string;
  nom: string;
  email: string;
  role: 'ADMIN' | 'CUISINE';
  actif: boolean;
}

export interface Comptes {
  compteurs: { eleves: number; parentsLies: number; elevesAvecAllergie: number; soldesBas: number };
  eleves: EleveCompte[];
  parents: ParentCompte[];
  personnel: PersonnelCompte[];
}

// ─── Rapports ───
export interface Synthese {
  periode: { debut: string; fin: string; jours: number };
  repasServis: { total: number; presence: number; evolution: number | null };
  recettes: { total: number; ticketMoyen: number };
  gaspillageEvite: { kg: number; repas: number; offres: number };
  satisfaction: { moyenne: number; avis: number };
  frequentation: { debut: string; fin: string; repas: number }[];
  recharges: {
    total: number;
    parMoyen: { moyen: string | null; montant: number; pourcentage: number }[];
  };
  ventes: { categorie: string; ventes: number; montant: number }[];
  offresFinService: { ventes: number; montant: number };
  notesPlats: { plat: string; note: number; avis: number }[];
}

/** Accès typé à l'API de la cantine : chaque méthode renvoie directement le contenu de `data`. */
@Injectable({ providedIn: 'root' })
export class CantineApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private get<T>(
    chemin: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params))
      if (v !== undefined && v !== '') p = p.set(k, String(v));
    return this.http
      .get<Enveloppe<T>>(`${this.base}${chemin}`, { params: p })
      .pipe(map((r) => r.data));
  }

  // Statistiques
  statsJour(date?: string): Observable<StatsJour> {
    return this.get('/stats/jour', { date });
  }
  reservations7Jours(date?: string): Observable<JourReservations[]> {
    return this.get('/stats/reservations', { date });
  }
  prevision(date?: string): Observable<Prevision> {
    return this.get('/stats/prevision', { date });
  }

  // Menus
  semaine(debut?: string): Observable<Semaine> {
    return this.get('/menus/semaine', { debut });
  }
  composer(date: string, items: { platId: string; portionsPrevues?: number }[]) {
    return this.http.put<Enveloppe<unknown>>(`${this.base}/menus/${date}`, { items });
  }
  publier(date: string, publie: boolean) {
    return this.http.post<Enveloppe<unknown>>(
      `${this.base}/menus/${date}/${publie ? 'publier' : 'depublier'}`,
      {},
    );
  }

  // Plats
  plats(params: {
    q?: string;
    categorie?: string;
    allergene?: string;
    inclureArchives?: boolean;
    page?: number;
    limit?: number;
  }) {
    return this.http
      .get<Enveloppe<Plat[]>>(`${this.base}/plats`, {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
        ) as never,
      })
      .pipe(map((r) => ({ plats: r.data, meta: r.meta })));
  }
  allergenes(): Observable<Allergene[]> {
    return this.get('/allergenes');
  }
  creerPlat(f: FormulairePlat) {
    return this.http.post<Enveloppe<Plat>>(`${this.base}/plats`, f);
  }
  modifierPlat(id: string, f: Partial<FormulairePlat> & { actif?: boolean }) {
    return this.http.patch<Enveloppe<Plat>>(`${this.base}/plats/${id}`, f);
  }
  archiverPlat(id: string) {
    return this.http.delete<Enveloppe<Plat>>(`${this.base}/plats/${id}`);
  }

  // Commandes et comptoir
  commandes(params: {
    date?: string;
    creneauId?: string;
    statut?: string;
    q?: string;
  }): Observable<Commandes> {
    return this.get('/reservations', params);
  }
  scanner(code: string) {
    return this.http
      .post<Enveloppe<Reservation>>(
        `${this.base}/reservations/scan`,
        { code },
        { context: new HttpContext().set(SILENT_HTTP_ERROR, true) },
      )
      .pipe(map((r) => r.data));
  }
  servir(id: string, controleAllergie: boolean) {
    return this.http
      .post<Enveloppe<Reservation>>(`${this.base}/reservations/${id}/servir`, { controleAllergie })
      .pipe(map((r) => r.data));
  }
  lancerOffre(date: string, o: { reduction: number; dureeMinutes: number }) {
    return this.http.post<Enveloppe<{ plats: number; elevesNotifies: number; jusqua: string }>>(
      `${this.base}/menus/${date}/anti-gaspi`,
      o,
    );
  }
  cloreOffre(date: string) {
    return this.http.delete<Enveloppe<unknown>>(`${this.base}/menus/${date}/anti-gaspi`);
  }
  // Stocks
  stocks(): Observable<Stocks> {
    return this.get('/stocks');
  }
  mouvementStock(
    id: string,
    m: { type: 'ENTREE' | 'SORTIE'; quantite: number; motif: string; note?: string },
  ) {
    return this.http.post<Enveloppe<ArticleStock>>(`${this.base}/stocks/${id}/mouvements`, m);
  }

  // Comptes
  comptes(): Observable<Comptes> {
    return this.get('/utilisateurs');
  }
  inviter(c: { prenom: string; nom: string; email: string; role: string; classe?: string }) {
    return this.http.post<
      Enveloppe<{
        id: string;
        email: string;
        role: string;
        motDePasseTemporaire: string;
        codeLiaison: string | null;
      }>
    >(`${this.base}/utilisateurs`, c);
  }
  lierParent(parentId: string, enfantId: string) {
    return this.http.post<Enveloppe<unknown>>(`${this.base}/utilisateurs/liens`, {
      parentId,
      enfantId,
    });
  }
  definirActif(id: string, actif: boolean) {
    return this.http.patch<Enveloppe<unknown>>(`${this.base}/utilisateurs/${id}/actif`, { actif });
  }

  // Rapports
  synthese(debut?: string, fin?: string): Observable<Synthese> {
    return this.get('/rapports/synthese', { debut, fin });
  }

  creneauxDuJour(date: string): Observable<Creneau[]> {
    return this.get(`/menus/${date}/creneaux`);
  }
}

/** « 11:45 » → « 11h45 ». */
export function heure(h: string): string {
  return h.replace(':', 'h');
}
