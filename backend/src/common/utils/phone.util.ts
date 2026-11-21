/**
 * Normalisation des numéros de téléphone ivoiriens.
 *
 * Le même abonné se saisit de six façons — `+225 07 00 00 00 10`, `0700000010`,
 * `00225-0700000010`… Sans forme canonique unique en base, aucune recherche par égalité ne
 * fonctionne et aucune contrainte d'unicité n'a de sens. Tout numéro est donc normalisé au
 * moment de l'écriture **et** au moment de la recherche.
 *
 * Forme canonique retenue : `+225` suivi du numéro national, sans séparateur.
 */

/** Indicatif Côte d'Ivoire, sans le `+`. */
const COUNTRY_CODE = '225';

/** Le plan de numérotation ivoirien est passé à 10 chiffres en 2021 ; 8 subsiste en base. */
const NATIONAL_MIN_DIGITS = 8;
const NATIONAL_MAX_DIGITS = 10;

/** Caractères tolérés dans une saisie : chiffres, séparateurs usuels, préfixe international. */
const PHONE_SHAPED = /^[+\d][\d\s.\-()]*$/;

/**
 * Ramène une saisie à la forme `+225XXXXXXXXXX`.
 *
 * @returns le numéro canonique, ou `null` si la saisie n'est pas un numéro ivoirien exploitable.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!PHONE_SHAPED.test(trimmed)) {
    return null;
  }

  let digits = trimmed.replace(/\D/g, '');

  // `00225…` et `+225…` désignent le même indicatif : on ramène tout à `225…`.
  if (digits.startsWith(`00${COUNTRY_CODE}`)) {
    digits = digits.slice(2);
  }

  const national = digits.startsWith(COUNTRY_CODE) ? digits.slice(COUNTRY_CODE.length) : digits;

  if (national.length < NATIONAL_MIN_DIGITS || national.length > NATIONAL_MAX_DIGITS) {
    return null;
  }

  return `+${COUNTRY_CODE}${national}`;
}

/**
 * La saisie ressemble-t-elle à un numéro de téléphone plutôt qu'à un nom ?
 *
 * Sert à aiguiller une recherche : `yao` cherche un nom, `0700000010` cherche un numéro.
 * Volontairement plus tolérant que `normalizePhone` — une saisie qui ressemble à un numéro
 * mais ne se normalise pas doit être traitée comme un numéro introuvable, pas comme un nom.
 */
export function isPhoneLike(raw: string): boolean {
  const trimmed = raw.trim();
  if (!PHONE_SHAPED.test(trimmed)) {
    return false;
  }
  return trimmed.replace(/\D/g, '').length >= NATIONAL_MIN_DIGITS;
}
