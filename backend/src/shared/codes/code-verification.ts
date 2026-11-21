import { normaliserCode, tirerCaracteres } from './code-lisible';

/** Préfixe des reçus de recharge : `RC-7K2M-4F9Q-XB3T`. */
export const PREFIXE_CODE_RECU = 'RC';

/** Préfixe des codes de réservation (affichés sous le QR) : `RV-7K2M-4F9Q-XB3T`. */
export const PREFIXE_CODE_RESERVATION = 'RV';
/**
 * Code de vérification d'un document émis par la plateforme : reçu de recharge, réservation.
 *
 * Forme : `RC-7K2M-4F9Q-XB3T`. Douze caractères tirés au hasard dans un alphabet de 31, soit
 * environ 8·10¹⁷ codes : on ne tombe pas sur un code valide en essayant. C'est ce qui permet
 * à la route de vérification d'être publique. Les tirets ne servent qu'à la lecture.
 */
export function genererCodeVerification(prefixe: string): string {
  const groupes = [tirerCaracteres(4), tirerCaracteres(4), tirerCaracteres(4)];
  return `${prefixe}-${groupes.join('-')}`;
}

/**
 * Ce qu'un humain recopie : minuscules, espaces autour, tirets oubliés ou en trop.
 * Renvoie `null` quand la saisie ne peut pas être un code, pour répondre « introuvable »
 * sans interroger la base.
 */
export function normaliserCodeVerification(brut: string, prefixe: string): string | null {
  const compact = normaliserCode(brut).replace(/[\s-]/g, '');
  const corps = compact.startsWith(prefixe) ? compact.slice(prefixe.length) : compact;
  if (!/^[ABCDEFGHJKLMNPQRTUVWXYZ23456789]{12}$/.test(corps)) return null;
  return `${prefixe}-${corps.slice(0, 4)}-${corps.slice(4, 8)}-${corps.slice(8)}`;
}
