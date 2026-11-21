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
  lundi?: string;
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
  note: number | null;
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

export type Moyen = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY';

export interface Enfant {
  id: string;
  nom: string;
  prenom: string | null;
  classe: string | null;
  allergenes: Allergene[];
  solde: number;
  seuilAlerte: number;
  soldeBas: boolean;
  repasDuJour: {
    plat: string;
    creneau: string;
    statut: StatutReservation;
    servieLe: string | null;
    allergieVerifiee: boolean;
  } | null;
}

export interface Transaction {
  id: string;
  type: 'RECHARGE' | 'REPAS' | 'REMBOURSEMENT';
  montant: number;
  moyen: Moyen | null;
  statut: 'EN_ATTENTE' | 'REUSSIE' | 'ECHOUEE';
  reference: string | null;
  creeLe: string;
  libelle: string;
}

export interface Recharge {
  id: string;
  reference: string | null;
  montant: number;
  moyen: Moyen | null;
  moyenLibelle: string | null;
  statut: 'EN_ATTENTE' | 'REUSSIE' | 'ECHOUEE';
  beneficiaire: string;
  urlPaiement?: string;
}

export interface ProfilEleve {
  nom: string;
  classe: string | null;
  codeLiaison: string | null;
  allergenes: Allergene[];
  solde: number;
  seuilAlerte: number;
  soldeBas: boolean;
  parents: string[];
}

export interface Notification {
  id: string;
  type: string;
  titre: string;
  corps: string;
  lue: boolean;
  creeLe: string;
}

export interface OffreAntiGaspi {
  menuItemId: string;
  plat: { id: string; nom: string; photoUrl: string | null; prix: number };
  prix: number;
  prixAntiGaspi: number;
  jusqua: string;
  portionsRestantes: number | null;
}

// ─── Appels ─────────────────────────────────────────────────────────────────

const lire = async <T>(url: string, params?: Record<string, string | undefined>): Promise<T> =>
  (await api.get<{ data: T }>(url, { params })).data.data;

export const cantineApi = {
  autour: (avant = 5, apres = 5) => lire<Semaine>('/menus/autour', { avant: String(avant), apres: String(apres) }),
  semaine: (debut?: string) => lire<Semaine>('/menus/semaine', { debut }),
  creneaux: (date: string) => lire<Creneau[]>(`/menus/${date}/creneaux`),
  portefeuille: () => lire<Portefeuille>('/portefeuille/me'),

  reserver: async (menuItemId: string, creneauId: string, antiGaspi = false): Promise<Reservation> =>
    (await api.post<{ data: Reservation }>('/reservations', { menuItemId, creneauId, antiGaspi })).data.data,
  mesReservations: () => lire<MesReservations>('/reservations/me'),
  noter: async (id: string, etoiles: number, etiquettes: string[], commentaire: string): Promise<void> => {
    await api.post(`/reservations/${id}/note`, {
      etoiles,
      etiquettes: etiquettes.length ? etiquettes : undefined,
      commentaire: commentaire.trim() || undefined,
    });
  },
  annuler: async (id: string): Promise<void> => {
    await api.delete(`/reservations/${id}`);
  },

  allergenes: () => lire<Allergene[]>('/allergenes'),
  mesAllergies: () => lire<Allergene[]>('/eleves/me/allergenes'),
  definirAllergies: async (codes: string[]): Promise<Allergene[]> =>
    (await api.put<{ data: Allergene[] }>('/eleves/me/allergenes', { codes })).data.data,
  codeLiaison: () => lire<{ codeLiaison: string }>('/eleves/me/code-liaison'),

  mesTransactions: () => lire<Transaction[]>('/portefeuille/me/transactions'),
  profilEleve: () => lire<ProfilEleve>('/eleves/me/profil'),
  preferencesNotif: () => lire<PreferencesNotif>('/notifications/preferences'),
  modifierPreferencesNotif: async (p: Partial<PreferencesNotif>) =>
    (await api.patch('/notifications/preferences', p)).data.data as PreferencesNotif,
  notifications: () => lire<{ nonLues: number; notifications: Notification[] }>('/notifications/me'),
  demanderRecharge: async () =>
    (await api.post('/portefeuille/me/demande-recharge')).data.data as { parentsPrevenus: number; nouvelles: number },
  marquerLue: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/lue`);
  },
  toutLire: async (): Promise<void> => {
    await api.post('/notifications/me/tout-lire');
  },
  offres: () => lire<OffreAntiGaspi[]>('/anti-gaspi/offres'),

  // Parent
  reglerSeuilEnfant: async (id: string, seuilAlerte: number) =>
    (await api.patch(`/parents/me/enfants/${id}/reglages`, { seuilAlerte })).data.data as { solde: number; seuilAlerte: number },
  definirAllergiesEnfant: async (enfantId: string, codes: string[]) =>
    (await api.put<{ data: Allergene[] }>('/eleves/me/allergenes', { codes, enfantId })).data.data,
  enfants: () => lire<Enfant[]>('/parents/me/enfants'),
  lierEnfant: async (codeLiaison: string): Promise<Enfant> =>
    (await api.post<{ data: Enfant }>('/parents/me/enfants', { codeLiaison })).data.data,
  transactionsEnfant: (id: string) => lire<Transaction[]>(`/parents/me/enfants/${id}/transactions`),
  recharger: async (montant: number, moyen: Moyen, enfantId?: string): Promise<Recharge> =>
    (await api.post<{ data: Recharge }>('/recharges', { montant, moyen, enfantId })).data.data,
  recharge: (id: string) => lire<Recharge>(`/recharges/${id}`),

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

export interface PreferencesNotif {
  alerteSoldeBas: boolean;
  recapQuotidien: boolean;
  alerteAllergie: boolean;
}
