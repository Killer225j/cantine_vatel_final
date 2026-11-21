// Adresse de l'API, figée à la compilation (EXPO_PUBLIC_API_URL, voir eas.json et .env.example).
// En développement : l'IP du poste sur le réseau local, port 3000.
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.1:3000').replace(/\/+$/, '');

export const Config = {
  API_ORIGIN,
  // Toutes les routes NestJS sont montées sous ce préfixe (voir main.ts : setGlobalPrefix).
  API_URL: `${API_ORIGIN}/api/v1`,
  ACCESS_TOKEN_KEY: 'cantine_access_token',
  REFRESH_TOKEN_KEY: 'cantine_refresh_token',
  USER_KEY: 'cantine_user',
  ONBOARDING_KEY: 'cantine_onboarding_vu',
};
