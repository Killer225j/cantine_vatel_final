import { HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête dont l'échec est un résultat normal (ex : sonder l'existence d'une
 * ressource optionnelle) — `error.interceptor.ts` n'affiche alors pas le toast rouge global,
 * l'appelant garde son propre `error:` pour traiter le cas silencieusement.
 */
export const SILENT_HTTP_ERROR = new HttpContextToken<boolean>(() => false);
