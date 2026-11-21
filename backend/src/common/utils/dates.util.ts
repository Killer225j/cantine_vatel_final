/**
 * Dates de la cantine, au format « AAAA-MM-JJ ».
 *
 * Abidjan est en UTC toute l'année (pas d'heure d'été), comme les serveurs de Render : la date
 * UTC est la date locale, et une colonne `@db.Date` se manipule comme minuit UTC.
 */

/** La date du jour (UTC = Abidjan). */
export function aujourdhui(maintenant: Date = new Date()): string {
  return maintenant.toISOString().slice(0, 10);
}

/** « 2026-11-23 » → Date à minuit UTC, pour une colonne `@db.Date`. */
export function versDate(jour: string): Date {
  return new Date(`${jour}T00:00:00.000Z`);
}

/** Date (minuit UTC) → « 2026-11-23 ». */
export function versJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ajouterJours(jour: string, n: number): string {
  const d = versDate(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return versJour(d);
}

/** Le lundi de la semaine qui contient ce jour. */
export function lundiDe(jour: string): string {
  const d = versDate(jour);
  const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  return ajouterJours(jour, -decalage);
}

/** Les cinq jours ouvrés (lundi → vendredi) de la semaine qui commence ce lundi. */
export function joursOuvres(lundi: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => ajouterJours(lundi, i));
}

/** Format « AAAA-MM-JJ » strict, pour valider un paramètre de route. */
export const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/;
