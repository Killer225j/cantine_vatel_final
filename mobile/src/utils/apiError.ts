import { Config } from '../constants/config';

// Forme réelle des erreurs renvoyées par l'API Cantine Vatel (voir
// backend/src/common/filters/http-exception.filter.ts) : {success:false, error:{code,
// message, details}, timestamp}. `message` est déjà la concaténation des
// messages class-validator.
interface BackendErrorEnvelope {
  success: false;
  error: {
    code: number;
    message: string;
    details?: string[];
  };
  timestamp: string;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: BackendErrorEnvelope }; request?: unknown })
    ?.response;

  const backendMessage = response?.data?.error?.message;
  if (backendMessage) return backendMessage;

  if (!response) {
    // Requête jamais arrivée à destination (mauvaise IP/port, serveur
    // injoignable, pas de réseau) — err.message d'axios ("Network Error")
    // n'aide pas l'utilisateur, on donne un message actionnable.
    // En développement, l'adresse visée s'affiche : c'est presque toujours elle le problème.
    const cible = __DEV__ ? ` (${Config.API_URL})` : '';
    return `Impossible de joindre le serveur${cible}. Vérifiez votre connexion et réessayez.`;
  }

  return fallback;
}
