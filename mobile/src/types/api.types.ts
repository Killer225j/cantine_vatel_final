// Types partagés avec l'API Cantine Vatel (NestJS). Les modèles de la cantine
// (plats, menus, créneaux, réservations, portefeuille…) s'ajoutent ici avec l'étape 2.

/** Rôles de l'appli mobile : élèves, parents et cuisine (comptoir). L'ADMIN utilise le back-office. */
export type Role = 'ELEVE' | 'PARENT' | 'ADMIN' | 'CUISINE';

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: 'ELEVE' | 'PARENT';
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Enveloppe uniforme de toutes les réponses de l'API. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
