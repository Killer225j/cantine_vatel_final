import api from './axios.config';

// ─── Types (formes renvoyées par l'API Cantine Vatel) ───────────────────────

export type Categorie = 'ENTREE' | 'PLAT' | 'DESSERT' | 'BOISSON';
export type StatutReservation = 'CONFIRMEE' | 'SERVIE' | 'ANNULEE' | 'ABSENT';

export interface Allergene {
  code: string;
  nom: string;
}

export interface Plat {
  id: string;
  nom: string;
  description: string | null;
  categorie: Categorie;
  prix: number;
  photoUrl: string | null;
  vegetarien: boolean;
  poidsPortionG: number | null;
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
  conflits: Allergene[];
}

export interface JourMenu {
  date: string;
  publie: boolean;
  items: ItemMenu[];
}

export interface Semaine {
  lundi: string;
  allergies: Allergene[];
  jours: JourMenu[];
}

export interface Creneau {
  id: string;
  heureDebut: string;
  heureFin: string;
  capacite: number;
  reserves: number;
  placesRestantes: number;
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
  note: { etoiles: number } | null;
  plat: { id: string; nom: string; categorie: Categorie };
  creneau: { id: string; heureDebut: string; heureFin: string };
  eleve: { id: string; nom: string; initiales: string; classe: string | null; allergenes: Allergene[] };
  alertesAllergie: Allergene[];
  controleAllergie: boolean;
}

export interface MesReservations {
  aVenir: Reservation[];
  historique: Reservation[];
}

export interface Portefeuille {
  solde: number;
  seuilAlerte: number;
  soldeBas: boolean;
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

// ─── Appels ─────────────────────────────────────────────────────────────────

const lire = async <T>(url: string, params?: Record<string, string | undefined>): Promise<T> =>
  (await api.get<{ data: T }>(url, { params })).data.data;

export const cantineApi = {
  semaine: (debut?: string) => lire<Semaine>('/menus/semaine', { debut }),
  creneaux: (date: string) => lire<Creneau[]>(`/menus/${date}/creneaux`),
  portefeuille: () => lire<Portefeuille>('/portefeuille/me'),

  reserver: async (menuItemId: string, creneauId: string): Promise<Reservation> =>
    (await api.post<{ data: Reservation }>('/reservations', { menuItemId, creneauId })).data.data,
  mesReservations: () => lire<MesReservations>('/reservations/me'),
  annuler: async (id: string): Promise<void> => {
    await api.delete(`/reservations/${id}`);
  },

  allergenes: () => lire<Allergene[]>('/allergenes'),
  mesAllergies: () => lire<Allergene[]>('/eleves/me/allergenes'),
  definirAllergies: async (codes: string[]): Promise<Allergene[]> =>
    (await api.put<{ data: Allergene[] }>('/eleves/me/allergenes', { codes })).data.data,
  codeLiaison: () => lire<{ codeLiaison: string }>('/eleves/me/code-liaison'),

  // Cuisine
  commandes: () => lire<Commandes>('/reservations'),
  scanner: async (code: string): Promise<Reservation> =>
    (await api.post<{ data: Reservation }>('/reservations/scan', { code })).data.data,
  servir: async (id: string, controleAllergie: boolean): Promise<Reservation> =>
    (await api.post<{ data: Reservation }>(`/reservations/${id}/servir`, { controleAllergie })).data
      .data,
};

/** Raison métier renvoyée par l'API dans `error.reason` (ex. CRENEAU_COMPLET). */
export function raisonErreur(err: unknown): string {
  return (
    (err as { response?: { data?: { error?: { reason?: string } } } })?.response?.data?.error
      ?.reason ?? ''
  );
}

export const fcfa = (n: number): string => `${n.toLocaleString('fr-FR')} FCFA`.replace(/ /g, ' ');
export const heure = (h: string): string => h.replace(':', 'h');
export const aujourdhui = (): string => new Date().toISOString().slice(0, 10);
