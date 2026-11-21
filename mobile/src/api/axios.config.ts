import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/config';
import { storage } from '../utils/storage';

const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Routes qui ne doivent jamais déclencher de refresh automatique (elles gèrent
// leurs 401 elles-mêmes — un mauvais mot de passe n'est pas un token expiré).
const AUTH_ROUTES_WITHOUT_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh'];

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Un seul refresh en vol à la fois, même si plusieurs requêtes échouent en 401
// en même temps (évite N appels /auth/refresh concurrents pour 1 token expiré).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
      `${Config.API_URL}/auth/refresh`,
      { refreshToken }
    );
    const tokens = data.data;
    await storage.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    await storage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = AUTH_ROUTES_WITHOUT_REFRESH.some((route) =>
      originalRequest?.url?.includes(route)
    );

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
