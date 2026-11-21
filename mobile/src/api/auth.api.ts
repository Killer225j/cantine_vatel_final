import api from './axios.config';
import { storage } from '../utils/storage';
import { ApiEnvelope, AuthTokens, LoginPayload, RegisterPayload, User } from '../types/api.types';

/** GET /auth/me — l'identité du compte connecté, quel que soit son rôle. */
const me = async (): Promise<User> => {
  const { data } = await api.get<ApiEnvelope<User>>('/auth/me');
  return data.data;
};

/** Enregistre les jetons puis lit le profil : une session ouverte rend toujours un `User`. */
async function ouvrirSession(tokens: AuthTokens): Promise<User> {
  await storage.setTokens(tokens.accessToken, tokens.refreshToken);
  const user = await me();
  await storage.setUser(user);
  return user;
}

const login = async (payload: LoginPayload): Promise<User> => {
  const { data } = await api.post<ApiEnvelope<AuthTokens>>('/auth/login', payload);
  return ouvrirSession(data.data);
};

const register = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await api.post<ApiEnvelope<AuthTokens>>('/auth/register', payload);
  return ouvrirSession(data.data);
};

const updateMe = async (payload: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>) => {
  const { data } = await api.patch<ApiEnvelope<User>>('/auth/me', payload);
  await storage.setUser(data.data);
  return data.data;
};

const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await api.patch('/auth/change-password', payload);
};

const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Révoquer côté serveur est souhaitable, pas indispensable : sans réseau ou avec un jeton
    // expiré, l'appel échoue alors qu'il n'y a plus rien à révoquer.
  } finally {
    await storage.clear();
  }
};

export const authApi = { login, register, me, updateMe, changePassword, logout };
