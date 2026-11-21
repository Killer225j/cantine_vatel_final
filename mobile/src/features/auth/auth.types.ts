import { User } from '../../types/api.types';

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  isAuthenticated: boolean;
  /** Vrai une fois la session locale relue au démarrage. */
  ready: boolean;
}

export interface LoginForm {
  mode: 'email' | 'phone';
  email: string;
  phone: string;
  dial: string;
  password: string;
}

export interface RegisterForm {
  role: 'ELEVE' | 'PARENT';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dial: string;
  password: string;
  acceptCgu: boolean;
}

export interface LoginErrors {
  email?: string;
  phone?: string;
  password?: string;
}

export interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  acceptCgu?: string;
}
