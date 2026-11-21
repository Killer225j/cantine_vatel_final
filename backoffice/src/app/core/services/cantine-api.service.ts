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
  creneauxDuJour(date: string): Observable<Creneau[]> {
    return this.get(`/menus/${date}/creneaux`);
  }
}

/** « 11:45 » → « 11h45 ». */
export function heure(h: string): string {
  return h.replace(':', 'h');
}
