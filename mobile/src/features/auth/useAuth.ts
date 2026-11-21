import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../../api/auth.api';
import { Role, User } from '../../types/api.types';
import { getApiErrorMessage } from '../../utils/apiError';
import { sanitizeEmail, sanitizeName, sanitizePassword, sanitizePhone } from '../../utils/sanitize';
import { storage } from '../../utils/storage';
import { AuthState, LoginErrors, LoginForm, RegisterErrors, RegisterForm } from './auth.types';

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  isAuthenticated: false,
  ready: false,
};

/** L'écran d'arrivée de chaque rôle. ADMIN et CUISINE n'ont pas d'espace mobile. */
export function accueilDuRole(role: Role | undefined): string {
  if (role === 'ELEVE') return '/(eleve)/(tabs)';
  if (role === 'PARENT') return '/(parent)/(tabs)';
  return '/(auth)/login';
}

interface AuthStore {
  state: AuthState;
  validateLogin: (form: LoginForm) => LoginErrors;
  validateRegister: (form: RegisterForm) => RegisterErrors;
  login: (form: LoginForm) => Promise<User | null>;
  register: (form: RegisterForm) => Promise<User | null>;
  logout: () => Promise<void>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<boolean>;
}

// Store partagé (Context) monté à la racine (app/_layout.tsx).
const AuthContext = createContext<AuthStore | null>(null);

function useAuthStore(): AuthStore {
  const [state, setState] = useState<AuthState>(initialState);
  const update = (partial: Partial<AuthState>) => setState((prev) => ({ ...prev, ...partial }));

  // Réhydratation au montage : une session valide peut déjà dormir dans le stockage.
  useEffect(() => {
    (async () => {
      const [token, user] = await Promise.all([storage.getToken(), storage.getUser<User>()]);
      update({ user: token ? user : null, isAuthenticated: Boolean(token && user), ready: true });
    })();
  }, []);

  const validateLogin = (form: LoginForm): LoginErrors => {
    const errors: LoginErrors = {};
    if (form.mode === 'email') {
      if (!form.email) errors.email = 'Email requis';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Email invalide';
    } else if (!form.phone || form.phone.replace(/\s/g, '').length < 8) {
      errors.phone = 'Numéro de téléphone invalide';
    }
    if (!form.password) errors.password = 'Mot de passe requis';
    return errors;
  };

  // Reflète les règles du backend (RegisterDto).
  const validateRegister = (form: RegisterForm): RegisterErrors => {
    const errors: RegisterErrors = {};
    if (!form.firstName.trim()) errors.firstName = 'Prénom requis';
    if (!form.lastName.trim()) errors.lastName = 'Nom requis';
    if (!form.email) errors.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Email invalide';
    if (form.phone && form.phone.replace(/\s/g, '').length < 8) errors.phone = 'Numéro invalide';
    if (!form.password) errors.password = 'Mot de passe requis';
    else if (form.password.length < 8) errors.password = 'Minimum 8 caractères';
    else if (!/(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Au moins une majuscule et un chiffre';
    }
    if (!form.acceptCgu) errors.acceptCgu = 'Vous devez accepter les conditions d’utilisation';
    return errors;
  };

  const login = useCallback(async (form: LoginForm): Promise<User | null> => {
    update({ status: 'loading', error: null });
    try {
      const payload =
        form.mode === 'email'
          ? { email: sanitizeEmail(form.email), password: sanitizePassword(form.password) }
          : {
              phone: `${form.dial}${sanitizePhone(form.phone).replace(/\s/g, '')}`,
              password: sanitizePassword(form.password),
            };
      const user = await authApi.login(payload);
      if (user.role !== 'ELEVE' && user.role !== 'PARENT') {
        await authApi.logout();
        update({
          status: 'error',
          error: 'Ce compte se connecte au back-office, pas à l’appli mobile.',
        });
        return null;
      }
      update({ user, status: 'success', isAuthenticated: true, error: null });
      return user;
    } catch (err: unknown) {
      update({ status: 'error', error: getApiErrorMessage(err, 'Identifiants incorrects') });
      return null;
    }
  }, []);

  const register = useCallback(async (form: RegisterForm): Promise<User | null> => {
    update({ status: 'loading', error: null });
    try {
      const phoneDigits = sanitizePhone(form.phone).replace(/\s/g, '');
      const user = await authApi.register({
        role: form.role,
        firstName: sanitizeName(form.firstName),
        lastName: sanitizeName(form.lastName),
        email: sanitizeEmail(form.email),
        phone: phoneDigits ? `${form.dial}${phoneDigits}` : undefined,
        password: sanitizePassword(form.password),
      });
      update({ user, status: 'success', isAuthenticated: true, error: null });
      return user;
    } catch (err: unknown) {
      update({ status: 'error', error: getApiErrorMessage(err, "Erreur lors de l'inscription") });
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ ...initialState, ready: true });
  }, []);

  const changePassword = useCallback(
    async (payload: { currentPassword: string; newPassword: string }): Promise<boolean> => {
      update({ status: 'loading', error: null });
      try {
        await authApi.changePassword(payload);
        update({ status: 'success' });
        return true;
      } catch (err: unknown) {
        update({ status: 'error', error: getApiErrorMessage(err, 'Impossible de changer le mot de passe') });
        return false;
      }
    },
    [],
  );

  return { state, validateLogin, validateRegister, login, register, logout, changePassword };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();
  return createElement(AuthContext.Provider, { value: store }, children);
}

export const useAuth = (): AuthStore => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() doit être appelé sous <AuthProvider>');
  return ctx;
};
