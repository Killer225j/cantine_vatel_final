import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Rôles de l'API. Le back-office sert ADMIN et CUISINE ; ELEVE et PARENT ont l'appli mobile. */
export type Role = 'ELEVE' | 'PARENT' | 'ADMIN' | 'CUISINE';
export const ROLES_BACKOFFICE: readonly Role[] = ['ADMIN', 'CUISINE'];

export const LIBELLE_ROLE: Record<Role, string> = {
  ELEVE: 'Élève',
  PARENT: 'Parent',
  ADMIN: 'Administration',
  CUISINE: 'Cuisine',
};

export interface CurrentUser {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  initiales: string;
  telephone: string | null;
  role: Role;
}

export interface Jetons {
  accessToken: string;
  refreshToken: string;
}

/** Enveloppe uniforme des réponses de l'API : { success, data, timestamp }. */
interface Enveloppe<T> {
  success: boolean;
  data: T;
}

/** GET /auth/me */
interface MeApi {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: Role;
}

const CLE_ACCES = 'cantine_bo_access';
const CLE_REFRESH = 'cantine_bo_refresh';

/**
 * Session du back-office : jetons JWT de l'API (accès + refresh).
 *
 * Les jetons vont dans `localStorage` avec « Se souvenir de moi », sinon dans `sessionStorage`
 * (ils meurent avec l'onglet : un poste de la cantine est souvent partagé). Le refresh est
 * fait par `authInterceptor` sur un 401.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<CurrentUser | null>(null);

  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  /** Page d'arrivée après connexion et repli d'une route interdite. */
  accueil = computed(() => '/dashboard');

  hasRole(...roles: string[]): boolean {
    const role = this.currentUser()?.role;
    return !!role && roles.map((r) => r.toUpperCase()).includes(role);
  }

  getRoleLabel(role: Role | undefined): string {
    return role ? LIBELLE_ROLE[role] : '';
  }

  /** Connexion par email. Refuse les comptes élève / parent, qui ont l'appli mobile. */
  login(email: string, password: string, seSouvenir = false): Observable<CurrentUser> {
    return this.http
      .post<Enveloppe<Jetons>>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((r) => this.enregistrer(r.data, seSouvenir)),
        switchMap(() => this.loadProfile()),
        tap((user) => {
          if (!ROLES_BACKOFFICE.includes(user.role)) {
            this.oublier();
            throw new Error('ROLE_MOBILE');
          }
        }),
      );
  }

  loadProfile(): Observable<CurrentUser> {
    return this.http.get<Enveloppe<MeApi>>(`${environment.apiUrl}/auth/me`).pipe(
      map((r) => versUtilisateur(r.data)),
      tap((user) => this.currentUser.set(user)),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .patch<unknown>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(map(() => void 0));
  }

  /** Révoque le refresh token côté serveur (au mieux) et vide la session locale. */
  logout(): void {
    if (this.jetonAcces()) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => undefined });
    }
    this.oublier();
  }

  // ─── Jetons ────────────────────────────────────────────────────────────────

  jetonAcces(): string | null {
    return this.lire(CLE_ACCES);
  }

  jetonRefresh(): string | null {
    return this.lire(CLE_REFRESH);
  }

  /** Sans précision (refresh), on reste dans le coffre où la session a commencé. */
  enregistrer(jetons: Jetons, persistant?: boolean): void {
    const garder = persistant ?? this.estPersistante();
    const coffre = garder ? localStorage : sessionStorage;
    const autre = garder ? sessionStorage : localStorage;
    try {
      autre.removeItem(CLE_ACCES);
      autre.removeItem(CLE_REFRESH);
      coffre.setItem(CLE_ACCES, jetons.accessToken);
      coffre.setItem(CLE_REFRESH, jetons.refreshToken);
    } catch {
      // Stockage refusé (navigation privée) : la session ne survivra pas au rechargement.
    }
  }

  oublier(): void {
    for (const coffre of [localStorage, sessionStorage]) {
      try {
        coffre.removeItem(CLE_ACCES);
        coffre.removeItem(CLE_REFRESH);
      } catch {
        // Rien à oublier.
      }
    }
    this.currentUser.set(null);
  }

  private estPersistante(): boolean {
    try {
      return localStorage.getItem(CLE_ACCES) !== null;
    } catch {
      return false;
    }
  }

  private lire(cle: string): string | null {
    try {
      return sessionStorage.getItem(cle) ?? localStorage.getItem(cle);
    } catch {
      return null;
    }
  }
}

function versUtilisateur(me: MeApi): CurrentUser {
  const prenom = me.firstName ?? '';
  const nom = me.lastName ?? '';
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || me.email.slice(0, 2).toUpperCase();
  return {
    id: me.id,
    email: me.email,
    prenom,
    nom,
    initiales,
    telephone: me.phone,
    role: me.role,
  };
}
