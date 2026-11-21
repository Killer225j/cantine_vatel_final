import { randomInt } from 'crypto';

/**
 * Alphabet sans caractère ambigu : ni `O` contre `0`, ni `I` contre `1`, ni `S` contre `5`.
 * Un code fait de ces caractères se lit à voix haute et se recopie à la main quand le QR ne
 * passe pas. Réservations et reçus en tirent leur code.
 */
export const ALPHABET_LISIBLE = 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';

/** `longueur` caractères tirés au hasard cryptographique dans l'alphabet lisible. */
export function tirerCaracteres(longueur: number): string {
  let code = '';
  for (let i = 0; i < longueur; i += 1) {
    code += ALPHABET_LISIBLE[randomInt(0, ALPHABET_LISIBLE.length)];
  }
  return code;
}

/** Une saisie manuelle tolère les minuscules et les espaces autour. */
export function normaliserCode(brut: string): string {
  return brut.trim().toUpperCase();
}
